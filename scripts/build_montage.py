#!/usr/bin/env python3
"""Build a flash-montage HyperFrames project from a plan.

usage:
  python3 -I scripts/build_montage.py <plan.json> <out_dir>
  python3 -I scripts/build_montage.py --example > plan.json      # print the default (Kimi-measured) plan

The plan's defaults reproduce the structure measured in the Kimi K3.1 teaser (24.1 s, 159 shots):
  origin (67 f) -> burst A (48 shots, 2f->6f) -> hold (30 f) -> burst B (35 shots) -> hold (34 f)
  -> burst C (71 shots, 1f->11f) -> hero hold (63 f, chroma glitch) -> mark (92 f)

Output is a normal HyperFrames project: index.html + compositions/{origin,flood,mark}.html,
assets/shots/*.jpg (copied from the library), assets/procedural/ (live specimens), SHOTLIST.json, CREDITS.md.
Then: cd <out_dir> && npx hyperframes check --json && npx hyperframes snapshot && npx hyperframes render
"""
import html, json, math, os, random, re, shutil, subprocess, sys

from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "assets", "library")

DEFAULT_PLAN = {
    "seed": 7,
    "fps": 30, "width": 1920, "height": 1080,
    "brand": "ATLAS",
    "product": "Atlas Code",
    "prompt": "Build a complex procedural 3D scene in Three.js.",
    "info": [["Directory:", "/Users/you"], ["Model:", "Atlas 1.0"], ["Version:", "1.0.0"]],
    "code": None,
    "origin": {"frames": 67, "specimen": "retro-terminal", "glitch_frames": 14},
    "bursts": [
        {"shots": 48, "from": 1.5, "to": 6.0, "power": 2.6,
         "hold": {"specimen": "particle-sphere", "frames": 30, "glitch": "block", "glitch_frames": 12}},
        {"shots": 35, "from": 1.8, "to": 6.0, "power": 2.5,
         "hold": {"specimen": "wire-flower", "frames": 34, "glitch": "block", "glitch_frames": 12}},
        {"shots": 71, "from": 1.0, "to": 11.0, "power": 4.0,
         "hold": {"specimen": "moon", "frames": 63, "glitch": "chroma", "glitch_frames": 22}},
    ],
    "mark": {"frames": 92, "color": "#ffffff", "ground": "#000000", "size": 64},
    "themes": {
        "shells-fossils": 1, "anatomy-skeleton": 1, "macro-eyes-skin": 1, "botanical": 1.2, "creatures": 1.2,
        "geology-ice": 1, "cosmos": 1, "earth-aerial": 1.3, "machines-engineering": 1.3, "drawings-archive": 1.1,
        "studio-objects": 0.8, "textures-full-bleed": 0.6, "procedural": 1.4,
    },
    "procedural_max_share": 0.35,
    "ground_mix": {"seamless-light": 0.5, "seamless-dark": 0.2, "full-bleed": 0.3},
    "chip_share": 0.3,
    "collage_share": 0.05,
    "exclude_specimens": ["code-sheet"],
    # Sound cues. "at" anchors: origin | burst:<i> | glitch:<i> (a hold's glitch-out) | mark | f:<frame>.
    # Optional per cue: "offset" (frames), "frames" (trim length), "fade_out" (seconds).
    # "file" is a path, or "sfx:<name>" for the HyperFrames media-use bundled library (Pixabay licence).
    # The skill never synthesises sound; supply a bed (music/drone) yourself or via `media-use resolve --type bgm`.
    "audio": {"bed": None, "bed_volume": 0.8, "cues": [
        {"at": "origin", "file": "sfx:typing", "offset": 8, "volume": 0.26},
        {"at": "glitch:-1", "file": "sfx:glitch-3", "volume": 0.38},
        {"at": "burst:0", "file": "sfx:impact-bass-1", "volume": 0.68},
        {"at": "glitch:0", "file": "sfx:glitch-1", "volume": 0.41},
        {"at": "burst:1", "file": "sfx:impact-bass-2", "volume": 0.64},
        {"at": "glitch:1", "file": "sfx:glitch-3", "volume": 0.41},
        {"at": "burst:2", "file": "sfx:impact-bass-1", "volume": 0.71},
        {"at": "glitch:2", "file": "sfx:glitch-2", "volume": 0.38},
        {"at": "mark", "file": "sfx:ping", "volume": 0.52},
    ]},
}

SFX_DIRS = [os.path.expanduser("~/.claude/skills/media-use/audio/assets/sfx"),
            os.path.expanduser("~/.agents/skills/media-use/audio/assets/sfx"),
            os.path.expanduser("~/.cursor/skills/media-use/audio/assets/sfx")]


def resolve_sfx(ref):
    if not ref.startswith("sfx:"):
        return ref if os.path.exists(ref) else None
    for d in SFX_DIRS:
        f = os.path.join(d, ref[4:] + ".mp3")
        if os.path.exists(f):
            return f
    return None


# ---------------------------------------------------------------- timing

def burst_frames(n, a, b, p):
    """Continuous ease from a to b frames per shot; boundaries rounded on the cumulative sum, so 1.5 -> 2,1,2,1."""
    acc, out, prev = 0.0, [], 0
    for i in range(n):
        x = i / max(1, n - 1)
        acc += a + (b - a) * (x ** p)
        cut = max(prev + 1, round(acc))
        out.append(cut - prev)
        prev = cut
    return out


# ---------------------------------------------------------------- library

OFF_STYLE = re.compile(r"\b(portrait|selfie|people|crowd|wedding|coffee|latte|food|meal|toy|lego|doll|poster|newspaper|"
                       r"graffiti|mural|tourist|parking|street|president|ceremony|meeting|soldier|family|girl|boy|woman|man)\b", re.I)


def load_library(plan):
    """Manifest minus curated rejects (assets/library/rejects.txt) minus off-style titles."""
    if not os.path.exists(os.path.join(LIB, "manifest.jsonl")):
        sys.exit("no asset library yet: run  python3 -I scripts/get_library.py  (989 open images, ~200 MB)")
    rp = os.path.join(LIB, "rejects.txt")
    rej = {l.strip() for l in open(rp) if l.strip() and not l.startswith("#")} if os.path.exists(rp) else set()
    recs, seen = [], set()
    for line in open(os.path.join(LIB, "manifest.jsonl")):
        r = json.loads(line)
        if r["file"] in seen or r["file"] in rej or not os.path.exists(os.path.join(ROOT, r["file"])):
            continue
        if r["category"] != "procedural" and OFF_STYLE.search(r.get("title") or ""):
            continue
        pal = r.get("palette") or []
        if pal and max(int(c[i:i + 2], 16) for c in pal for i in (1, 3, 5)) < 48:
            continue  # near-black frame: flashes as an empty cut
        seen.add(r["file"])
        if r.get("specimen") in plan["exclude_specimens"]:
            continue
        if r.get("license") == "nasa-check-credit":
            continue
        if r["category"] not in plan["themes"]:
            continue
        if r["category"] == "procedural" and r.get("specimen") in {b["hold"]["specimen"] for b in plan["bursts"]}:
            continue  # the holds own these looks
        recs.append(r)
    return recs


def edge_color(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    b = max(3, min(w, h) // 30)
    strips = [im.crop((0, 0, w, b)), im.crop((0, h - b, w, h)), im.crop((0, 0, b, h)), im.crop((w - b, 0, w, h))]
    m = [sum(ImageStat.Stat(s).mean[c] for s in strips) / 4 for c in range(3)]
    return "#%02x%02x%02x" % tuple(int(v) for v in m)


DARK_SPECIMENS = {"moon", "galaxy", "black-hole", "jellyfish", "contour-terrain", "nautilus-section", "code-sheet", "frost-dendrite"}


def ground_of(r):
    if r["category"] == "procedural":
        return "seamless-dark" if r.get("specimen") in DARK_SPECIMENS else "seamless-light"
    return r.get("ground", "full-bleed")


def pick_shots(plan, recs, n_total, rng):
    by_cat = {}
    for r in recs:
        by_cat.setdefault(r["category"], []).append(r)
    for v in by_cat.values():
        rng.shuffle(v)
    cats = [c for c in plan["themes"] if by_cat.get(c)]
    weights = [plan["themes"][c] for c in cats]
    picks, used, last_cat, grounds = [], set(), None, []
    proc_cap = int(n_total * plan["procedural_max_share"])
    proc_n = 0
    target = plan["ground_mix"]
    for i in range(n_total):
        # ground: steer toward the target mix, avoid three in a row
        counts = {g: grounds.count(g) + 1e-3 for g in target}
        want = max(target, key=lambda g: target[g] - counts[g] / (len(grounds) + 1) + rng.random() * 0.25)
        if len(grounds) >= 2 and grounds[-1] == grounds[-2] == want:
            want = rng.choice([g for g in target if g != want])
        best = None
        for _ in range(40):
            c = rng.choices(cats, weights)[0]
            if c == last_cat or (c == "procedural" and proc_n >= proc_cap):
                continue
            pool = [r for r in by_cat[c] if r["file"] not in used]
            if not pool:
                continue
            match = [r for r in pool if ground_of(r) == want]
            best = (match or pool)[0]
            break
        if best is None:  # library exhausted: allow repeats
            best = rng.choice(recs)
        used.add(best["file"])
        last_cat = best["category"]
        proc_n += best["category"] == "procedural"
        grounds.append(ground_of(best))
        picks.append(best)
    return picks


# ---------------------------------------------------------------- html

CODE_DEFAULT = [
    "const geometry = new THREE.BufferGeometry();", "geometry.setAttribute('position', positions);",
    "for (let i = 0; i < SETTINGS.particleCount; i++) {", "positions.setY(i, height * SETTINGS.terrainHeight);",
    "color.setHSL(0.48 + height * 0.14, 0.6, 0.5);", "mesh.instanceMatrix.needsUpdate = true;",
    "const material = new THREE.MeshPhysicalMaterial({", "roughness: 0.38, metalness: 0.85,", "scene.add(sculpture);",
    "const curve = new THREE.CatmullRomCurve3(points);", "ribbon.rotation.y = time * (0.018 + index * 0.003);",
    "const edges = new THREE.EdgesGeometry(geometry, 4);", "renderer.toneMapping = THREE.ACESFilmicToneMapping;",
    "function createTerrain(rng) {", "const panel = new THREE.Mesh(geometry, darkMetal);", "architecture.add(mesh);",
    "transform.scale.set(width, height, width);", "camera.position.lerp(target, 0.04);",
]


def sec(f, fps):
    return f"{f / fps:.4f}".rstrip("0").rstrip(".") if f else "0"


def head(title):
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>{html.escape(title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
"""


def chips_html(rng, lines, light):
    out = []
    for _ in range(rng.randint(2, 7)):
        t = rng.choice(lines)
        t = t[: max(6, int(len(t) * rng.uniform(0.35, 1)))]
        x, y = rng.uniform(4, 78), rng.uniform(4, 92)
        out.append(f'<span class="chip{" d" if not light else ""}" style="left:{x:.1f}%;top:{y:.1f}%">{html.escape(t)}</span>')
    return "".join(out)


# ---------------------------------------------------------------- teaser end card

def teaser_scene(plan, picks, out, rng):
    """End card for plan.mark.style == "teaser": a wall of every shot compresses into the brand mark on dark,
    hard cut to the lockup on the brand ground, a version tag stamps in, the URL types out."""
    from PIL import Image as _I
    fps, W, H, m = plan["fps"], plan["width"], plan["height"], plan["mark"]
    T = lambda fr: f"{fr / fps:.4f}"
    bdir = os.path.join(out, "assets", "brand")
    os.makedirs(os.path.join(bdir, "fonts"), exist_ok=True)
    os.makedirs(os.path.join(bdir, "tiles"), exist_ok=True)
    faces, loads = [], []
    for fnt in m.get("fonts", []):
        dst = os.path.basename(fnt["file"])
        shutil.copy(os.path.expanduser(fnt["file"]), os.path.join(bdir, "fonts", dst))
        st, wt = fnt.get("style", "normal"), fnt.get("weight", "400")
        faces.append(f'@font-face {{ font-family: "{fnt["family"]}"; src: url("assets/brand/fonts/{dst}") format("woff2"); font-style: {st}; font-weight: {wt}; }}')
        loads.append(f'{"italic " if st == "italic" else ""}{str(wt).split()[-1]} 40px "{fnt["family"]}"')
    logo, aspect = "", "1"
    if m.get("logo"):
        im = _I.open(os.path.expanduser(m["logo"])).convert("RGBA")
        im = im.crop(im.split()[3].getbbox())
        im.save(os.path.join(bdir, "mark.png"))
        aspect = f"{im.width} / {im.height}"
        logo = "assets/brand/mark.png"
    # the wall: every shot at once, as small tiles
    cols, rows = m.get("wall", [16, 9])
    cw, ch = W / cols, H / rows
    pool = [p for p in picks if p.get("thumb") or p.get("file")]
    rng.shuffle(pool)
    tiles = []
    for k in range(cols * rows):
        r = pool[k % len(pool)]
        src = os.path.join(ROOT, r.get("thumb") or r["file"])
        name = f"t{k:03d}.jpg"
        try:
            t = _I.open(src).convert("RGB")
            t.thumbnail((240, 240))
            t.save(os.path.join(bdir, "tiles", name), quality=80)
        except OSError:
            continue
        x, y = (k % cols) * cw, (k // cols) * ch
        tiles.append(f'<img class="tile" src="assets/brand/tiles/{name}" alt="" style="left:{x + 3:.1f}px;top:{y + 3:.1f}px;width:{cw - 6:.1f}px;height:{ch - 6:.1f}px" '
                     f'data-dx="{W / 2 - (x + cw / 2):.1f}" data-dy="{H / 2 - (y + ch / 2):.1f}" />')
    c0, cf = m.get("collapse_at", 3), m.get("collapse_frames", 22)
    rv, tg, uf, cpf = m.get("reveal_at", 30), m.get("tag_at", 44), m.get("url_at", 58), m.get("url_char_frames", 2)
    words = "".join(f'<span class="w{" acc" if w.get("accent") else ""}{" it" if w.get("italic") else ""}">{html.escape(w["text"])}</span>'
                    for w in m.get("words", [{"text": plan["brand"]}]))
    url = m.get("url", "")
    url_spans = "".join(f'<span class="ch">{html.escape(c)}</span>' for c in url)
    sets = [f'tl.set("#url .ch:nth-child({i + 1})", {{ display: "inline" }}, {T(uf + i * cpf)});' for i in range(len(url))]
    end = uf + len(url) * cpf
    sets += [f'tl.set("#caret", {{ opacity: {1 if (i % 2) else 0} }}, {T(end + 8 + i * 9)});' for i in range(max(0, (m["frames"] - end - 8) // 9))]
    g = m.get("glitch_px", 7)
    jitter = lambda sel, fr: (f'tl.set("{sel}", {{ x: {g}, textShadow: "-{g}px 0 rgba(255,0,72,.55), {g}px 0 rgba(0,190,255,.55)" }}, {T(fr)});'
                              f'tl.set("{sel}", {{ x: -{g // 2}, textShadow: "{g // 2}px 0 rgba(255,0,72,.4), -{g // 2}px 0 rgba(0,190,255,.4)" }}, {T(fr + 1)});'
                              f'tl.set("{sel}", {{ x: 0, textShadow: "none" }}, {T(fr + 2)});')
    S = m.get("size", 84)
    scene = f"""<template>
  <style>
    {chr(10).join("    " + f for f in faces).strip()}
    #root {{ position: absolute; inset: 0; background: {m.get("dark", "#0a0a0a")}; overflow: hidden; }}
    #root .tile {{ position: absolute; object-fit: cover; will-change: transform; }}
    #core {{ position: absolute; left: 50%; top: 50%; width: {m.get("core_size", 150)}px; aspect-ratio: {aspect}; margin: 0 0 0 -{m.get("core_size", 150) // 2}px; translate: 0 -50%; background: center / contain no-repeat; transform: scale(0); }}
    #paper {{ position: absolute; inset: 0; background: {m.get("ground", "#fbfbf8")}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: {round(S * 0.42)}px; }}
    #lockup {{ display: flex; align-items: center; gap: {round(S * 0.2)}px; font-family: "{m.get("word_font", "Georgia")}", Georgia, serif; font-weight: {m.get("word_weight", 700)}; font-size: {S}px; letter-spacing: -0.02em; color: {m.get("ink", "#171717")}; line-height: 1; }}
    #lockup img {{ height: {round(S * 1.02)}px; }}
    #lockup .acc {{ color: {m.get("accent", "#0566ff")}; }}
    #lockup .it {{ font-style: italic; }}
    #tag {{ font-style: italic; color: {m.get("accent", "#0566ff")}; font-size: {round(S * 0.62)}px; align-self: flex-start; margin-left: {round(S * 0.06)}px; visibility: hidden; }}
    #url {{ font-family: "{m.get("url_font", "Menlo")}", ui-monospace, Menlo, monospace; font-weight: 500; font-size: {round(S * 0.32)}px; letter-spacing: 0.02em; color: {m.get("muted", "#696967")}; height: {round(S * 0.4)}px; display: flex; align-items: center; }}
    #url .ch {{ display: none; }}
    #caret {{ display: inline-block; width: {round(S * 0.16)}px; height: {round(S * 0.36)}px; margin-left: 3px; background: {m.get("accent", "#0566ff")}; opacity: 0; }}
  </style>
  <div id="root" data-composition-id="mark" data-width="{W}" data-height="{H}" data-layout-allow-overlap data-layout-allow-overflow>
    <div id="wall" class="clip" data-start="0" data-duration="{T(rv)}" data-track-index="1">
      {"".join(tiles)}
      {f'<div id="core" style="background-image:url({logo})"></div>' if logo else ""}
    </div>
    <div id="paper" class="clip" data-start="{T(rv)}" data-duration="{T(m["frames"] - rv)}" data-track-index="2">
      <div id="lockup">{f'<img src="{logo}" alt="" />' if logo else ""}<span>{words}</span><span id="tag">{html.escape(m.get("tag", ""))}</span></div>
      <div id="url">{url_spans}<i id="caret"></i></div>
    </div>
  </div>
  <script>
    (function () {{
      const tl = gsap.timeline({{ paused: true }});
      const tiles = Array.from(document.querySelectorAll("#wall .tile"));
      tl.to(tiles, {{ x: (i, el) => +el.dataset.dx, y: (i, el) => +el.dataset.dy, scale: 0.03, duration: {(cf - 5) / fps:.4f}, ease: "power4.in",
                     stagger: {{ amount: {5 / fps:.4f}, from: "edges" }} }}, {T(c0)});
      tl.set(tiles, {{ autoAlpha: 0 }}, {T(c0 + cf)});
      tl.fromTo("#core", {{ scale: 0 }}, {{ scale: 1, duration: {(rv - c0 - cf + 3) / fps:.4f}, ease: "expo.out" }}, {T(c0 + cf - 3)});
      {jitter("#lockup", rv)}
      tl.set("#caret", {{ opacity: 1 }}, {T(uf - 6)});
      tl.set("#tag", {{ visibility: "visible" }}, {T(tg)});
      {jitter("#tag", tg)}
      {(chr(10) + "      ").join(sets)}
      window.__timelines["mark"] = tl;
      window.__hf = window.__hf || {{}};
      window.__hf.buildReady = window.__hf.buildReady || {{}};
      window.__hf.buildReady["mark"] = Promise.all({json.dumps(loads)}.map((f) => document.fonts.load(f))).catch(() => null);
    }})();
  </script>
</template>
"""
    open(os.path.join(out, "compositions", "mark.html"), "w").write(scene)


def bed_automation(shape, level, burst_starts, end_f, fps):
    """Volume lane for the bed: fade in, a short inhale before every burst after the first, then a filtered fall-off
    ending at end_f (so the bed is sucked out on the collapse). Times are clip-relative seconds."""
    s = lambda f: round(f / fps, 4)
    inh, lo = shape.get("inhale_frames", 5), shape.get("inhale_level", 0.08) * level
    pts = [{"t": 0, "v": 0}, {"t": shape.get("fade_in", 0.5), "v": level}]
    for b in burst_starts[1:]:
        pts += [{"t": s(b - inh - 2), "v": level}, {"t": s(b - inh), "v": lo}, {"t": s(b - 1), "v": lo}, {"t": s(b), "v": level}]
    sweep = shape.get("end_frames", 20)
    pts += [{"t": s(end_f - sweep), "v": level}, {"t": s(end_f), "v": 0}]
    lp = [{"t": 0, "v": 18000}, {"t": s(end_f - sweep), "v": 18000}, {"t": s(end_f), "v": 220, "curve": -0.6}]
    return {"version": 1, "lanes": [{"target": "volume", "points": pts}, {"target": "fx.lp.frequency", "points": lp}]}


def build(plan, out):
    rng = random.Random(plan["seed"])
    fps, W, H = plan["fps"], plan["width"], plan["height"]
    code = plan["code"] or CODE_DEFAULT
    recs = load_library(plan)
    if len(recs) < 40:
        sys.exit(f"library too small ({len(recs)} usable records): run scripts/fetch_assets.py / render_specimens.py first")

    # schedule (frames, relative to the flood scene)
    sched, f = [], 0
    for bi, b in enumerate(plan["bursts"]):
        for d in burst_frames(b["shots"], b["from"], b["to"], b["power"]):
            sched.append({"kind": "shot", "burst": bi, "f0": f, "fd": d}); f += d
        sched.append({"kind": "hold", "burst": bi, "f0": f, "fd": b["hold"]["frames"], **b["hold"]}); f += b["hold"]["frames"]
    flood_frames = f
    o_frames, m_frames = plan["origin"]["frames"], plan["mark"]["frames"]
    total = o_frames + flood_frames + m_frames

    shots = [s for s in sched if s["kind"] == "shot"]
    picks = pick_shots(plan, recs, len(shots), rng)

    # scaffold with the real CLI so the project matches the installed HyperFrames version
    if not os.path.exists(os.path.join(out, "index.html")):
        env = dict(os.environ, HYPERFRAMES_SKIP_SKILLS="1")
        subprocess.run(["npx", "--yes", "hyperframes", "init", os.path.basename(out), "--example", "blank", "--non-interactive"],
                       cwd=os.path.dirname(os.path.abspath(out)) or ".", env=env, check=True, capture_output=True)
    os.makedirs(os.path.join(out, "compositions"), exist_ok=True)
    os.makedirs(os.path.join(out, "assets", "shots"), exist_ok=True)
    dst_proc = os.path.join(out, "assets", "procedural")
    if os.path.exists(dst_proc):
        shutil.rmtree(dst_proc)
    shutil.copytree(os.path.join(ROOT, "assets", "procedural"), dst_proc, ignore=shutil.ignore_patterns("lab.html"))

    # ---- one scene per burst (its flash shots + its hold), timed locally from the burst's first frame
    credits, shotlist, pi, bursts_meta = [], [], 0, []
    THREE_TAG = '<script type="module" src="assets/procedural/vendor/three.module.min.js"></script>'
    for bi in range(len(plan["bursts"])):
        part = [(i, s) for i, s in enumerate(sched) if s["burst"] == bi]
        base = part[0][1]["f0"]
        bframes = sum(s["fd"] for _, s in part)
        items, js_motion, holds = [], [], []
        for idx, s in part:
            sid = f"b{bi}s{idx:03d}"
            lf = s["f0"] - base
            start, dur = sec(lf, fps), sec(s["fd"], fps)
            if s["kind"] == "shot":
                r = picks[pi]; pi += 1
                ext_name = f"{idx:03d}-{os.path.basename(r['file'])}"
                shutil.copy(os.path.join(ROOT, r["file"]), os.path.join(out, "assets", "shots", ext_name))
                g = ground_of(r)
                bg = edge_color(os.path.join(ROOT, r["file"])) if g != "full-bleed" else "#000"
                fit = "contain" if g != "full-bleed" else "cover"
                inner = f'<img id="{sid}-img" src="assets/shots/{ext_name}" style="object-fit:{fit}" alt="" />'
                if rng.random() < plan["collage_share"] and s["fd"] <= 3:
                    cells = []
                    for k, e in enumerate(rng.sample(recs, 3)):
                        en = f"{idx:03d}-c{k}-{os.path.basename(e['file'])}"
                        shutil.copy(os.path.join(ROOT, e["file"]), os.path.join(out, "assets", "shots", en))
                        cells.append(f'<img src="assets/shots/{en}" alt="" />')
                        credits.append(e)
                    inner = f'<div class="collage"><img id="{sid}-img" src="assets/shots/{ext_name}" alt="" />{"".join(cells)}</div>'
                    bg = "#fff"
                if rng.random() < plan["chip_share"]:
                    inner += chips_html(rng, code, g != "seamless-dark")
                items.append(f'    <div id="{sid}" class="clip shot" data-start="{start}" data-duration="{dur}" data-track-index="1" style="background:{bg}">{inner}</div>')
                if s["fd"] >= 3:
                    js_motion.append(f'tl.fromTo("#{sid}-img", {{ scale: 1 }}, {{ scale: {1 + 0.006 * s["fd"]:.3f}, duration: {s["fd"] / fps:.4f}, ease: "none" }}, {lf / fps:.4f});')
                credits.append(r)
                shotlist.append({"id": sid, "frame": o_frames + s["f0"], "frames": s["fd"], "file": r["file"], "category": r["category"], "ground": g})
            else:
                items.append(
                    f'    <div id="{sid}" class="clip hold" data-start="{start}" data-duration="{dur}" data-track-index="2">'
                    f'<canvas id="{sid}-cv" width="{W}" height="{H}"></canvas><canvas id="{sid}-gl" width="{W}" height="{H}"></canvas></div>')
                holds.append({"id": sid, "t0": lf / fps, "d": s["fd"] / fps, "specimen": s["specimen"], "seed": plan["seed"] + idx,
                              "glitch": s.get("glitch", "block"), "gd": s.get("glitch_frames", 12) / fps})
                shotlist.append({"id": sid, "frame": o_frames + s["f0"], "frames": s["fd"], "specimen": s["specimen"], "glitch": s.get("glitch")})
        cid = f"burst{bi}"
        bursts_meta.append({"id": cid, "f0": base, "frames": bframes})
        scene = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; background: #000; overflow: hidden; }}
    #root .shot, #root .hold {{ position: absolute; inset: 0; overflow: hidden; }}
    #root .shot > img {{ position: absolute; left: 0; top: 0; width: 100%; height: 100%; }}
    #root .collage {{ position: absolute; inset: 0; display: grid; grid-template-columns: 1.4fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; background: #fff; }}
    #root .collage img {{ width: 100%; height: 100%; object-fit: cover; }}
    #root .collage img:first-child {{ grid-row: span 2; }}
    #root .hold canvas {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
    #root .chip {{ position: absolute; font: 13px/1.5 "JetBrains Mono", monospace; color: #f4fff8; background: rgba(150,162,172,0.45); padding: 1px 7px; white-space: nowrap; }}
    #root .chip.d {{ background: rgba(20,26,34,0.6); color: #cfe8ff; }}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="{W}" data-height="{H}" data-layout-allow-overlap data-layout-allow-overflow>
{chr(10).join(items)}
  </div>
  {THREE_TAG}
  <script>
    (function () {{
      const HOLDS = {json.dumps(holds)};
      const CODE = {json.dumps(code)};
      const tl = gsap.timeline({{ paused: true }});
      {(chr(10) + "      ").join(js_motion)}
      const ready = Promise.all([import("./assets/procedural/specimens.js"), import("./assets/procedural/glitch.js")]).then(async ([S, G]) => {{
        for (const h of HOLDS) {{
          const cv = document.getElementById(h.id + "-cv"), gl = document.getElementById(h.id + "-gl").getContext("2d");
          const spec = await S.mountSpecimen(cv, h.specimen, {{ seed: h.seed, width: {W}, height: {H} }});
          const st = {{ t: 0 }};
          const draw = () => {{
            spec.render(st.t);
            gl.clearRect(0, 0, {W}, {H});
            const k = Math.max(0, (st.t - (h.d - h.gd)) / h.gd);
            if (k > 0) G.glitchOut(gl, cv, Math.min(1, k), Math.round(st.t * {fps}), {{ lines: CODE, mode: h.glitch }});
            else G.codeChips(gl, Math.min(1, st.t / h.d) * 0.35, 99 + h.seed, CODE);
          }};
          tl.fromTo(st, {{ t: 0 }}, {{ t: h.d, duration: h.d, ease: "none", onUpdate: draw }}, h.t0);
          draw();
        }}
        window.__timelines["{cid}"] = tl;
      }});
      window.__hf = window.__hf || {{}};
      window.__hf.buildReady = window.__hf.buildReady || {{}};
      window.__hf.buildReady["{cid}"] = ready;
    }})();
  </script>
</template>
"""
        open(os.path.join(out, "compositions", f"{cid}.html"), "w").write(scene)
    stale = os.path.join(out, "compositions", "flood.html")
    if os.path.exists(stale):
        os.remove(stale)

    # ---- origin scene
    o = plan["origin"]
    origin = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; background: #d6d5d1; overflow: hidden; }}
    #root canvas {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
  </style>
  <div id="root" data-composition-id="origin" data-width="{W}" data-height="{H}" data-layout-allow-overlap>
    <canvas id="origin-cv" class="clip" data-start="0" data-duration="{sec(o_frames, fps)}" data-track-index="1" width="{W}" height="{H}"></canvas>
    <canvas id="origin-gl" class="clip" data-start="0" data-duration="{sec(o_frames, fps)}" data-track-index="2" width="{W}" height="{H}"></canvas>
  </div>
  <script type="module" src="assets/procedural/vendor/three.module.min.js"></script>
  <script>
    (function () {{
      const OPTS = {json.dumps({"product": plan["product"], "prompt": plan["prompt"], "info": plan["info"], "code": code})};
      const D = {o_frames / fps:.4f}, GD = {o["glitch_frames"] / fps:.4f};
      const tl = gsap.timeline({{ paused: true }});
      const ready = Promise.all([import("./assets/procedural/specimens.js"), import("./assets/procedural/glitch.js")]).then(async ([S, G]) => {{
        const cv = document.getElementById("origin-cv"), gl = document.getElementById("origin-gl").getContext("2d");
        const spec = await S.mountSpecimen(cv, "{o['specimen']}", {{ seed: 1, width: {W}, height: {H}, opts: OPTS }});
        const st = {{ t: 0 }};
        const draw = () => {{
          spec.render(st.t);
          gl.clearRect(0, 0, {W}, {H});
          const k = Math.max(0, (st.t - (D - GD)) / GD);
          if (k > 0) G.glitchOut(gl, cv, Math.min(1, k), Math.round(st.t * {fps}), {{ lines: OPTS.code, mode: "block", chips: false }});
        }};
        tl.fromTo(st, {{ t: 0 }}, {{ t: D, duration: D, ease: "none", onUpdate: draw }}, 0);
        draw();
        window.__timelines["origin"] = tl;
      }});
      window.__hf = window.__hf || {{}};
      window.__hf.buildReady = window.__hf.buildReady || {{}};
      window.__hf.buildReady["origin"] = ready;
    }})();
  </script>
</template>
"""
    open(os.path.join(out, "compositions", "origin.html"), "w").write(origin)

    # ---- mark scene
    m = plan["mark"]
    if m.get("style") == "teaser":
        teaser_scene(plan, picks, out, rng)
    else:
      mark = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; background: {m['ground']}; display: flex; align-items: center; justify-content: center; }}
    #mark-word {{ color: {m['color']}; font-family: "Archivo Black", Inter, sans-serif; font-size: {m['size']}px; letter-spacing: 0.04em; }}
  </style>
  <div id="root" data-composition-id="mark" data-width="{W}" data-height="{H}">
    <div id="mark-word" class="clip" data-start="0" data-duration="{sec(m_frames, fps)}" data-track-index="1" data-var-text="brand">{html.escape(plan['brand'])}</div>
  </div>
  <script>
    window.__timelines["mark"] = gsap.timeline({{ paused: true }});
  </script>
</template>
"""
      open(os.path.join(out, "compositions", "mark.html"), "w").write(mark)

    # ---- audio (only what the plan supplies; this skill never synthesises sound)
    aud, a = [], plan.get("audio") or {}
    os.makedirs(os.path.join(out, "assets", "audio"), exist_ok=True)
    burst_starts = [o_frames + s["f0"] for i, s in enumerate(sched) if s["kind"] == "shot" and (i == 0 or sched[i - 1]["kind"] == "hold")]
    glitch_starts = [o_frames - plan["origin"]["glitch_frames"]] + [
        o_frames + s["f0"] + s["fd"] - s.get("glitch_frames", 12) for s in sched if s["kind"] == "hold"]
    anchors = {"origin": 0, "mark": o_frames + flood_frames}
    anchors.update({f"burst:{i}": f for i, f in enumerate(burst_starts)})
    anchors.update({f"glitch:{i - 1}": f for i, f in enumerate(glitch_starts)})  # glitch:-1 is the origin's glitch-out

    def place(path, aid, start_f, vol, frames=None, fade_out=None):
        dst = f"{aid}-{os.path.basename(path)}"
        shutil.copy(path, os.path.join(out, "assets", "audio", dst))
        trim = (f' data-duration="{sec(frames, fps)}"' if frames else "") + (f' data-fade-out="{fade_out}"' if fade_out else "")
        aud.append(f'      <audio id="{aid}" class="clip" src="assets/audio/{dst}" data-start="{sec(max(0, start_f), fps)}"{trim} data-track-index="{6 + len(aud)}" data-volume="{vol}"></audio>')

    bed = os.path.expanduser(a.get("bed") or "")
    if bed and not os.path.exists(bed):
        print(f"skip bed {bed} (file missing)", file=sys.stderr)
    elif bed:
        if a.get("bed_shape") is not None:
            end_f = anchors[a["bed_shape"].get("end", "mark")] + a["bed_shape"].get("end_offset", 0)
            auto = bed_automation(a["bed_shape"], a.get("bed_volume", 0.8), burst_starts, end_f, fps)
            dst = f"bed-{os.path.basename(bed)}"
            shutil.copy(bed, os.path.join(out, "assets", "audio", dst))
            fx = {"version": 1, "nodes": [{"type": "lowpass", "id": "lp", "label": "Collapse sweep", "params": {"frequency": 18000}}]}
            q = lambda o: html.escape(json.dumps(o, separators=(",", ":")), quote=True)
            aud.append(f'      <audio id="bed" class="clip" src="assets/audio/{dst}" data-start="0" data-duration="{sec(end_f, fps)}" data-track-index="{6 + len(aud)}" '
                       f'data-fx-chain="{q(fx)}" data-automation="{q(auto)}"></audio>')
        else:
            place(bed, "bed", 0, a.get("bed_volume", 0.8))
    for i, c in enumerate(a.get("cues", [])):
        at = c["at"]
        f0 = int(at[2:]) if at.startswith("f:") else anchors.get(at)
        path = resolve_sfx(c["file"])
        if f0 is None or not path:
            print(f"skip cue {at} {c['file']} (anchor or file missing)", file=sys.stderr)
            continue
        place(path, f"cue{i:02d}", f0 + c.get("offset", 0), c.get("volume", 0.8), c.get("frames"), c.get("fade_out"))

    bursts_hosts = "\n".join(
        f'      <div id="{b["id"]}" data-composition-id="{b["id"]}" data-composition-src="compositions/{b["id"]}.html" data-start="{sec(o_frames + b["f0"], fps)}" '
        f'data-duration="{sec(b["frames"], fps)}" data-track-index="2" data-track-kind="graphics" data-width="{W}" data-height="{H}"></div>' for b in bursts_meta)
    index = head(plan["brand"] + " flash montage") + f"""    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 100%; height: 100%; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{sec(total, fps)}" data-width="{W}" data-height="{H}">
      <div id="origin" data-composition-id="origin" data-composition-src="compositions/origin.html" data-start="0" data-duration="{sec(o_frames, fps)}" data-track-index="1" data-track-kind="graphics" data-width="{W}" data-height="{H}"></div>
{bursts_hosts}
      <div id="mark" data-composition-id="mark" data-composition-src="compositions/mark.html" data-start="{sec(o_frames + flood_frames, fps)}" data-duration="{sec(m_frames, fps)}" data-track-index="3" data-track-kind="graphics" data-width="{W}" data-height="{H}" data-variable-values='{json.dumps({"brand": plan["brand"]})}'></div>
{chr(10).join(aud)}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
    open(os.path.join(out, "index.html"), "w").write(index)

    # ---- provenance
    json.dump({"plan": plan, "total_frames": total, "shots": shotlist}, open(os.path.join(out, "SHOTLIST.json"), "w"), indent=1)
    seen, lines = set(), ["# Credits", "", "Every image is CC0, public domain, NASA media, or generated by this project's code.", ""]
    for r in credits:
        if r["file"] in seen:
            continue
        seen.add(r["file"])
        lines.append(f"- {r.get('title') or ''} — {r.get('creator') or 'unknown'} · {r.get('license')} · {r.get('page') or r.get('source_url')}")
    open(os.path.join(out, "CREDITS.md"), "w").write("\n".join(lines) + "\n")
    n_cuts = len(sched) + 1
    print(json.dumps({"out": out, "frames": total, "seconds": round(total / fps, 2), "shots": len(shots), "holds": sum(s["kind"] == "hold" for s in sched),
                      "cuts_per_sec": round(n_cuts / (total / fps), 2), "unique_images": len(seen)}))


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--example":
        print(json.dumps(DEFAULT_PLAN, indent=2)); return
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    plan = json.loads(json.dumps(DEFAULT_PLAN))
    user = json.load(open(sys.argv[1]))
    for k, v in user.items():
        if isinstance(v, dict) and isinstance(plan.get(k), dict) and k not in ("themes", "ground_mix"):
            plan[k].update(v)
        else:
            plan[k] = v
    build(plan, sys.argv[2])


if __name__ == "__main__":
    main()
