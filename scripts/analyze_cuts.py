#!/usr/bin/env python3
"""Analyze a flash-montage video: cut times, shot lengths (frames), bursts, and a per-shot contact sheet.
usage: python3 -I analyze_cuts.py <video> <outdir> [threshold=0.2]
"""
import json, os, subprocess, sys

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)

def main():
    video, out = sys.argv[1], sys.argv[2]
    thr = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
    os.makedirs(out, exist_ok=True)
    probe = json.loads(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=r_frame_rate,width,height:format=duration", "-of", "json", video]).stdout)
    num, den = map(int, probe["streams"][0]["r_frame_rate"].split("/"))
    fps = num / den
    dur = float(probe["format"]["duration"])
    r = run(["ffmpeg", "-i", video, "-vf", f"select='gt(scene,{thr})',showinfo", "-f", "null", "-"])
    cuts = [float(l.split("pts_time:")[1].split()[0]) for l in r.stderr.splitlines() if "pts_time:" in l]
    bounds = [0.0] + cuts + [dur]
    shots = [{"start": round(a, 3), "frames": max(1, round((b - a) * fps))} for a, b in zip(bounds, bounds[1:])]
    lens = [s["frames"] for s in shots]
    # bursts: runs of shots <= 6 frames terminated by a hold >= 15 frames
    bursts, cur = [], []
    for s in shots:
        if s["frames"] <= 8:
            cur.append(s)
        else:
            if len(cur) >= 5:
                bursts.append({"start": cur[0]["start"], "shots": len(cur), "end_hold_frames": s["frames"],
                               "first5": [c["frames"] for c in cur[:5]], "last5": [c["frames"] for c in cur[-5:]]})
            cur = []
    summary = {"video": os.path.basename(video), "fps": fps, "duration": dur, "shots": len(shots),
               "cuts_per_sec": round(len(cuts) / dur, 2),
               "median_shot_frames": sorted(lens)[len(lens) // 2],
               "shots_le_2f": sum(l <= 2 for l in lens), "shots_le_4f": sum(l <= 4 for l in lens),
               "holds_ge_24f": [s for s in shots if s["frames"] >= 24], "bursts": bursts}
    json.dump({"summary": summary, "shots": shots}, open(os.path.join(out, "cuts.json"), "w"), indent=1)
    # one mid-frame per shot -> contact sheet
    sel = "+".join(f"eq(n\\,{int((s['start'] + s['frames'] / fps / 2) * fps)})" for s in shots)
    cols = 10
    rows = (len(shots) + cols - 1) // cols
    run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf",
         f"select='{sel}',scale=256:-1,tile={cols}x{rows}", "-frames:v", "1", "-vsync", "vfr",
         os.path.join(out, "shots_sheet.jpg")])
    print(json.dumps(summary, indent=1))

if __name__ == "__main__":
    main()
