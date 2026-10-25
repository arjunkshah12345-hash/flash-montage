#!/usr/bin/env python3
"""Download the open asset library (989 CC0 / public-domain / NASA / generated images, ~200 MB) into assets/library/.

The library lives in its own repo and site: https://github.com/arjunkshah12345-hash/flash-montage-library
Browse it at https://arjunkshah12345-hash.github.io/flash-montage-library/

usage:
  python3 -I scripts/get_library.py                       # everything (git shallow clone when git is available)
  python3 -I scripts/get_library.py --only cosmos,botanical   # some categories, file by file over HTTPS
  python3 -I scripts/get_library.py --http                # force file-by-file download
Files already on disk are skipped, so re-running resumes. Records you add later with fetch_assets.py are kept.
"""
import argparse, concurrent.futures as cf, json, os, shutil, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "assets", "library")
REPO = "https://github.com/arjunkshah12345-hash/flash-montage-library.git"
BASE = "https://arjunkshah12345-hash.github.io/flash-montage-library/"


def get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": "flash-montage-skill/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def merge_manifest(remote_lines):
    """Remote records first, then any local-only records (from fetch_assets.py), deduped by file."""
    path = os.path.join(LIB, "manifest.jsonl")
    local = [l for l in open(path)] if os.path.exists(path) else []
    seen, out = set(), []
    for l in list(remote_lines) + local:
        l = l.strip()
        if not l:
            continue
        f = json.loads(l)["file"]
        if f not in seen:
            seen.add(f)
            out.append(l)
    open(path, "w").write("\n".join(out) + "\n")
    return len(out)


def via_git():
    tmp = tempfile.mkdtemp(prefix="fm-lib-")
    try:
        subprocess.run(["git", "clone", "--depth", "1", REPO, tmp], check=True)
        src = os.path.join(tmp, "assets", "library")
        n = 0
        for dp, _, files in os.walk(src):
            rel = os.path.relpath(dp, src)
            os.makedirs(os.path.join(LIB, rel), exist_ok=True)
            for fn in files:
                if fn == "manifest.jsonl":
                    continue
                dst = os.path.join(LIB, rel, fn)
                if not os.path.exists(dst):
                    shutil.move(os.path.join(dp, fn), dst)
                    n += 1
        total = merge_manifest(open(os.path.join(src, "manifest.jsonl")))
        print(f"library: {n} files added, {total} records in manifest")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def via_http(only):
    lines = get(BASE + "assets/library/manifest.jsonl").decode().splitlines()
    recs = [json.loads(l) for l in lines if l.strip()]
    if only:
        recs = [r for r in recs if r["category"] in only]
        lines = [json.dumps(r) for r in recs]
    jobs = [p for r in recs for p in (r["file"], r.get("thumb")) if p and not os.path.exists(os.path.join(ROOT, p))]

    def one(p):
        dst = os.path.join(ROOT, p)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        data = get(BASE + p)
        open(dst + ".part", "wb").write(data)
        os.replace(dst + ".part", dst)
        return len(data)

    done = failed = 0
    with cf.ThreadPoolExecutor(8) as ex:
        for fut in cf.as_completed([ex.submit(one, p) for p in jobs]):
            try:
                fut.result()
                done += 1
            except Exception as e:  # noqa: BLE001 — report and keep going; a re-run resumes
                failed += 1
                print("failed:", e, file=sys.stderr)
            if (done + failed) % 100 == 0:
                print(f"  {done + failed}/{len(jobs)}", flush=True)
    total = merge_manifest(lines)
    print(f"library: {done} files downloaded, {failed} failed, {total} records in manifest")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma-separated categories")
    ap.add_argument("--http", action="store_true", help="download file by file instead of git clone")
    a = ap.parse_args()
    os.makedirs(LIB, exist_ok=True)
    only = {c.strip() for c in a.only.split(",") if c.strip()}
    if not only and not a.http and shutil.which("git"):
        via_git()
    else:
        via_http(only)


if __name__ == "__main__":
    main()
