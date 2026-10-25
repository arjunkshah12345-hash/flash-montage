#!/usr/bin/env python3
"""Index the asset library: numbered contact sheets per category (for visual curation) + an HTML gallery.

usage: python3 -I scripts/make_index.py [--cols 10 --rows 6]
Writes:
  assets/library/_sheets/<category>-<n>.jpg   numbered tiles (number = position in the matching .json list)
  assets/library/_sheets/<category>-<n>.json  [file, ...] in tile order
  assets/library/INDEX.html                   every usable asset, thumbnails, licence on hover, filter by category/ground
  assets/library/INDEX.md                     counts by category / ground / licence / provider
Rejected files (assets/library/rejects.txt, one library-relative path per line) are left out of sheets and gallery.
Curation loop for an agent: run this, Read each sheet, append bad files to rejects.txt, re-run.
"""
import argparse, collections, html, json, os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "assets", "library")


def load():
    rej = set()
    rp = os.path.join(LIB, "rejects.txt")
    if os.path.exists(rp):
        rej = {l.strip() for l in open(rp) if l.strip() and not l.startswith("#")}
    recs, seen = [], set()
    for line in open(os.path.join(LIB, "manifest.jsonl")):
        r = json.loads(line)
        if r["file"] in seen or r["file"] in rej or not os.path.exists(os.path.join(ROOT, r["file"])):
            continue
        seen.add(r["file"])
        recs.append(r)
    return recs, rej


def sheets(recs, cols, rows, tw=240, th=150):
    out = os.path.join(LIB, "_sheets")
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    by = collections.defaultdict(list)
    for r in recs:
        by[r["category"]].append(r)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 16)
    except OSError:
        font = ImageFont.load_default()
    per = cols * rows
    for cat, items in sorted(by.items()):
        for si in range(0, len(items), per):
            chunk = items[si: si + per]
            sheet = Image.new("RGB", (cols * tw, rows * th), (24, 24, 24))
            d = ImageDraw.Draw(sheet)
            for k, r in enumerate(chunk):
                try:
                    im = Image.open(os.path.join(ROOT, r["thumb"])).convert("RGB")
                except OSError:
                    continue
                im.thumbnail((tw - 4, th - 4))
                x, y = (k % cols) * tw, (k // cols) * th
                sheet.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
                d.rectangle([x, y, x + 34, y + 20], fill=(255, 230, 0))
                d.text((x + 3, y + 1), str(k), fill=(0, 0, 0), font=font)
            n = si // per + 1
            sheet.save(os.path.join(out, f"{cat}-{n}.jpg"), quality=82)
            json.dump([r["file"] for r in chunk], open(os.path.join(out, f"{cat}-{n}.json"), "w"))


def gallery(recs):
    cats = sorted({r["category"] for r in recs})
    tiles = []
    for r in recs:
        tip = html.escape(f"{r.get('title') or ''} — {r.get('creator') or ''} · {r.get('license')} · {r['file']}")
        tiles.append(f'<a href="{html.escape(r.get("page") or r["file"][len("assets/library/"):])}" data-c="{r["category"]}" '
                     f'data-g="{r.get("ground", "procedural")}" title="{tip}"><img loading="lazy" src="{html.escape(r["thumb"][len("assets/library/"):])}"></a>')
    buttons = "".join(f'<button onclick="f(\'c\',\'{c}\')">{c}</button>' for c in cats)
    page = f"""<!doctype html><meta charset="utf-8"><title>flash-montage asset library</title>
<style>body{{margin:0;background:#111;color:#ddd;font:13px ui-monospace,Menlo,monospace}}header{{position:sticky;top:0;background:#111;padding:10px;z-index:2}}
button{{background:#222;color:#ddd;border:1px solid #333;margin:2px;padding:4px 8px;cursor:pointer}}main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px;padding:4px}}
main a{{aspect-ratio:16/10;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}}main img{{max-width:100%;max-height:100%}}</style>
<header><b>{len(recs)} assets</b> · CC0 / public domain / NASA / generated · hover for licence, click for source<br>
<button onclick="f()">all</button>{buttons} | <button onclick="f('g','seamless-light')">light</button><button onclick="f('g','seamless-dark')">dark</button><button onclick="f('g','full-bleed')">full-bleed</button></header>
<main>{"".join(tiles)}</main>
<script>function f(k,v){{document.querySelectorAll('main a').forEach(a=>a.style.display=!k||a.dataset[k]===v?'':'none')}}</script>"""
    open(os.path.join(LIB, "INDEX.html"), "w").write(page)


def summary(recs, rej):
    c = collections.Counter(r["category"] for r in recs)
    g = collections.Counter(r.get("ground", "procedural") for r in recs)
    l = collections.Counter(r.get("license") for r in recs)
    p = collections.Counter(r.get("provider") for r in recs)
    t = lambda cnt: "\n".join(f"| {k} | {v} |" for k, v in cnt.most_common())
    md = f"""# Asset library index

{len(recs)} usable assets ({len(rej)} rejected in curation). Browse: `INDEX.html`. Curation sheets: `_sheets/`.
Machine-readable: `manifest.jsonl` (licence, creator, source page, size, ground, palette, saturation per file).

## By category
| category | files |
| --- | --- |
{t(c)}

## By ground
| ground | files |
| --- | --- |
{t(g)}

## By licence
| licence | files |
| --- | --- |
{t(l)}

`nasa-check-credit` = NASA library item credited to ESA or another party: excluded by the builder; use only with its credit.

## By provider
| provider | files |
| --- | --- |
{t(p)}
"""
    open(os.path.join(LIB, "INDEX.md"), "w").write(md)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cols", type=int, default=10)
    ap.add_argument("--rows", type=int, default=6)
    a = ap.parse_args()
    recs, rej = load()
    sheets(recs, a.cols, a.rows)
    gallery(recs)
    summary(recs, rej)
    print(f"{len(recs)} assets indexed, {len(rej)} rejected")


if __name__ == "__main__":
    main()
