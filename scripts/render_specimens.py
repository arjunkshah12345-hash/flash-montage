#!/usr/bin/env python3
"""Render procedural specimens to stills and register them in the library manifest.

usage: python3 -I scripts/render_specimens.py [--seeds 6] [--only moon,galaxy] [--t 0.6] [--size 1920x1080] [--jobs 4]
Output: assets/library/procedural/<name>-s<seed>.jpg (+ thumbs/), records appended to manifest.jsonl
        with licence "generated (CC0)". Needs the HyperFrames Chrome (`npx hyperframes browser ensure`).
"""
import argparse, concurrent.futures as cf, json, os, socket, subprocess, sys, time

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(ROOT, "assets", "procedural")
LIB = os.path.join(ROOT, "assets", "library")
OUT = os.path.join(LIB, "procedural")
NAMES = ["ribbed-torus", "bead-ring", "iridescent-blob", "particle-sphere", "glass-dna", "candy-knot", "clay-swarm",
         "fuzzy-pill", "wire-torus", "exploded-turbine", "moon", "galaxy", "black-hole", "jellyfish", "wire-flower",
         "radial-lines", "attractor-ribbons", "vascular-tree", "flow-lines", "blueprint", "contour-terrain",
         "nautilus-section", "swiss-poster", "code-sheet", "fastener-grid", "frost-dendrite", "murmuration"]
CATEGORY = {"moon": "cosmos", "galaxy": "cosmos", "black-hole": "cosmos", "jellyfish": "creatures", "murmuration": "creatures",
            "wire-flower": "botanical", "vascular-tree": "botanical", "nautilus-section": "shells-fossils",
            "exploded-turbine": "machines-engineering", "fastener-grid": "machines-engineering", "blueprint": "drawings-archive",
            "frost-dendrite": "geology-ice", "code-sheet": "code-glitch", "swiss-poster": "graphic-design"}


def chrome():
    out = subprocess.run(["npx", "--yes", "hyperframes", "browser", "path"], capture_output=True, text=True).stdout.strip().splitlines()
    return out[-1] if out else None


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=6)
    ap.add_argument("--only")
    ap.add_argument("--t", type=float, default=0.6)
    ap.add_argument("--size", default="1920x1080")
    ap.add_argument("--jobs", type=int, default=4)
    a = ap.parse_args()
    W, H = map(int, a.size.split("x"))
    names = a.only.split(",") if a.only else NAMES
    ch = chrome()
    if not ch or not os.path.exists(ch):
        sys.exit("no Chrome: run `npx hyperframes browser ensure`")
    port = free_port()
    srv = subprocess.Popen([sys.executable, "-I", "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", PROC],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    os.makedirs(os.path.join(OUT, "thumbs"), exist_ok=True)

    def one(name, seed):
        png = os.path.join(OUT, f"{name}-s{seed}.png")
        url = f"http://127.0.0.1:{port}/lab.html?name={name}&seed={seed}&t={a.t}&w={W}&h={H}"
        subprocess.run([ch, "--headless", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars",
                        f"--window-size={W},{H}", "--virtual-time-budget=40000", f"--screenshot={png}", url],
                       capture_output=True, timeout=240)
        if not os.path.exists(png):
            return None
        img = Image.open(png).convert("RGB")
        os.remove(png)
        fn = f"{name}-s{seed}.jpg"
        img.save(os.path.join(OUT, fn), "JPEG", quality=88, optimize=True)
        th = img.copy(); th.thumbnail((320, 320)); th.save(os.path.join(OUT, "thumbs", fn), "JPEG", quality=78)
        return {"title": f"{name} (seed {seed})", "creator": "flash-montage procedural", "license": "generated-cc0",
                "license_url": "https://creativecommons.org/publicdomain/zero/1.0/", "page": None, "provider": "procedural",
                "file": f"assets/library/procedural/{fn}", "thumb": f"assets/library/procedural/thumbs/{fn}",
                "category": "procedural", "theme": CATEGORY.get(name, "studio-objects"), "specimen": name, "seed": seed,
                "source": "procedural", "w": W, "h": H, "aspect": round(W / H, 3), "source_url": f"procedural://{name}/{seed}"}

    try:
        jobs = [(n, s) for n in names for s in range(1, a.seeds + 1)]
        with cf.ThreadPoolExecutor(a.jobs) as pool, open(os.path.join(LIB, "manifest.jsonl"), "a") as mf:
            for rec in pool.map(lambda j: one(*j), jobs):
                if rec:
                    mf.write(json.dumps(rec) + "\n"); mf.flush()
                    print("ok", rec["file"], flush=True)
    finally:
        srv.terminate()


if __name__ == "__main__":
    main()
