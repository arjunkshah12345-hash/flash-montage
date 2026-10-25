---
name: flash-montage
description: Make the viral "flash montage" launch video — 150+ real-world objects, specimens, machines, drawings and cosmos images cut at 1–6 frames in decelerating bursts, each landing on a held hero object that glitches out into code, ending on a small wordmark (the Kimi K3.1 teaser format, Oct 2026). Use when someone asks for this style, a "Kimi-style" / "everything" / "wunderkammer" / rapid-object montage, a teaser that floods the screen with abstract real objects, or links a video like it. Ships a measured formula, a curated 989-image open-licence library, 28 procedural Three.js specimens, a glitch layer, and a builder that writes a ready HyperFrames project.
---

# Flash montage

A 24-second teaser that reads as "this thing can make *anything*": a product moment, then three bursts of
hundreds of unrelated, beautifully lit objects — a nautilus, a jet engine, a da Vinci page, a hurricane, a chrome
torus — flickering at 1–2 frames, slowing down, and landing on one hero object that dissolves into code. A black
frame, a small wordmark, silence.

The formula below is **measured** from the source (`references/teardown-kimi-k31.md`): 159 shots, 6.6 cuts/s,
median shot 2 frames. Every number here has a frame count behind it. Build it with HyperFrames (house default;
read `/hyperframes` first). Never Remotion unless the person names it.

## Setup (once)

```bash
npx skills add arjunkshah12345-hash/flash-montage          # this skill
python3 -I <skill-dir>/scripts/get_library.py              # the open image library, ~200 MB (or --only cosmos,botanical)
```

Needs Python 3.10+ with Pillow, Node 22+ (`npx hyperframes`), ffmpeg. Browse the library first at
https://arjunkshah12345-hash.github.io/flash-montage-library/ · project site: https://arjunkshah12345-hash.github.io/flash-montage-site/

## The formula (24 s @ 30 fps)

| Act | Frames | What happens |
| --- | --- | --- |
| **Origin** | 67 (2.2 s) | The product in a physical form: a beige retro computer, terminal types the prompt, camera pushes in; last ~14 f the screen tears into macroblocks. |
| **Burst A** | 48 shots, 127–140 f | Cuts at 2,1,2,1,2 f, easing out to 5–6 f. |
| **Hold A** | 30 f | One hero object (red sphere shedding particles). Code chips accumulate, last 12 f glitch-out. |
| **Burst B** | 35 shots, ~110 f | Restarts at 2 f → 6 f. |
| **Hold B** | 34 f | Hero #2 (x-ray wireframe flower), glitch-out. |
| **Burst C** | 71 shots, 207 f | The fastest: mostly 1-frame cuts for the first 20, decelerating to 7, 9, 9, 11 f — a ritardando. |
| **Hold C** | 63 f | The closing hero (the moon), still; then RGB channel split + pixelation. |
| **Mark** | 92 f | Hard cut to black. Small white wordmark (~6% of frame height), dead still. |

The rhythm is **fast → slow → hold**, three times, each burst faster and longer than the last. Shot length per
burst follows `d(i) = a + (b − a)·(i/n)^p` with p≈2.5–3.8, rounded on the cumulative sum so 1.5 f alternates 2,1,2,1
(`references/timing.md`). Cuts are *not* beat-synced: only 23% land on an audio onset. Sound marks bursts, not cuts.

## What sells it (the rules)

1. **One object, centred, on a seamless ground.** ~45% pale grey/white sweep, ~20% black, ~35% full-bleed
   (aerials, water, textures). Alternate grounds; never three of the same in a row (`references/look.md`).
2. **Breadth beats polish.** Never the same category twice in a row. The cut list should span shells, skeletons,
   machines, drawings, aerials, cosmos, studio 3D, science-viz, type (`references/shot-taxonomy.md`).
3. **Real things + rendered things.** Photos/scans of real objects carry "real world"; procedural 3D (chrome,
   glass, iridescent, wireframe) carries "made by the model". Keep procedural ≤ ~35% of flash shots.
4. **Holds are alive.** The three holds move (rotate, disintegrate, drift) and glitch out *into code* — the
   product's own code, as translucent chips (`references/glitch-and-overlays.md`).
5. **The mark is quiet.** Black, small, still, one high ping. No tagline, no URL, no animation. Exception: a
   **teaser** end card (`mark.style: "teaser"`, below) when the film announces a version or a launch.
6. **Silence before each burst.** ~4 frames of near-silence, then a struck chord/impact on the burst's first
   frame that decays as the cuts slow (`references/sound.md`).

## Workflow

```bash
SK=~/.agents/skills/flash-montage            # wherever `npx skills add` put this skill
python3 -I $SK/scripts/build_montage.py --example > plan.json   # edit brand/product/prompt/code/themes
python3 -I $SK/scripts/build_montage.py plan.json ./my-montage   # writes a HyperFrames project
cd my-montage && npx hyperframes check --json                   # lint; density warnings on bursts are expected
npx hyperframes snapshot --at 1,2.4,6.9,7.6,11.6,20,22.5 --no-end --describe false
npx hyperframes preview                                         # show the person; they can edit in the desktop app
npx hyperframes render -o renders/montage.mp4 -w 1              # after approval; -w 1 skips auto-calibration, which times out on the heavy hold scenes
```

The project has `compositions/origin.html`, `burst0..2.html` (every shot is a timed `<div class="clip">` in
HTML — editable in Studio), `mark.html`, `SHOTLIST.json` (frame-exact cut list with sources) and `CREDITS.md`.

**Plan keys** (`--example` prints all): `brand`, `product`, `prompt`, `info`, `code` (lines shown as chips — use
the product's real code), `origin.specimen`, `bursts[].{shots,from,to,power,hold}`, `hold.specimen`
(`particle-sphere`, `wire-flower`, `moon`, `galaxy`, `black-hole`, `iridescent-blob`, …), `hold.glitch`
(`block`|`chroma`), `themes` (category weights), `ground_mix`, `procedural_max_share`, `chip_share`,
`collage_share`, `audio.{bed,bed_shape,cues}`, `mark.style`, `seed` (new seed = new cut).

**Teaser end card** (`mark.style: "teaser"`, ~150 f): a wall of every shot appears for 3 f, compresses into the
brand mark on dark (22 f), hard cut to the lockup on the brand ground with a 2 f chroma jitter, a version tag
stamps in (`tag`, e.g. `v3`), the URL types out with a caret. Keys: `logo` (PNG, transparent; cropped to its
alpha box), `words` (`[{text, accent, italic}]`), `tag`, `url`, `fonts` (`[{family, file, style, weight}]` woff2,
copied into the project), `word_font`, `url_font`, `size`, `dark`/`ground`/`ink`/`accent`/`muted`, and frame
offsets `collapse_at`, `collapse_frames`, `reveal_at`, `tag_at`, `url_at`, `url_char_frames`. Cue its sound with
`{"at": "mark", "offset": n}`: riser cut and impact on `reveal_at`, ping on `tag_at`, soft typing on `url_at`.

**Music bed:** `audio.bed` (file) + `audio.bed_shape` writes a HyperFrames volume lane and a lowpass sweep: fade
in, an inhale dip before bursts B and C, and a filtered fall-off ending at `end` + `end_offset` (e.g. the collapse).
Get a bed via `references/sound.md`.

**Adapting:** 15 s → bursts of 30/24/40 shots, one fewer hold. Vertical → `width:1080,height:1920`; the
library's seamless shots stay centred with `contain`. Brand colour → set it on the mark only; the flood stays
neutral. A different origin (phone, robot, notebook) → write a specimen in `assets/procedural/specimens.js`.

## The asset directory

- `assets/library/` — **989 images** after a visual curation pass, CC0 / public domain / NASA / generated only, 13 categories, each with `thumbs/` (download: `scripts/get_library.py`);
  `manifest.jsonl` has licence, creator, source page, size, ground (light/dark/full-bleed), palette, saturation.
  Browse `assets/library/INDEX.html` or the per-category contact sheets in `assets/library/_sheets/`.
- `assets/procedural/` — 28 deterministic Three.js / canvas specimens (`lab.html?name=moon&seed=3&t=0.5` to
  view), `glitch.js`, vendored Three.js r184. Render more stills: `scripts/render_specimens.py --seeds 12`.
- `references/assets.md` — the full source directory (40+ open collections, APIs, licences, what each is good
  for), plus image-generation prompts in `references/prompts.md` for gaps.
- Grow it: `python3 -I scripts/fetch_assets.py --query "astrolabe" --category machines-engineering --source openverse`
  or add queries to `assets/sources/queries.json` and re-run (responses are cached; Openverse allows 200/day anon).

## Anti-slop checklist (before render)

- [ ] First 2.2 s show the product doing something, not a logo.
- [ ] No shot repeats; no category twice in a row; grounds alternate.
- [ ] Each burst starts at ≤2 f and ends ≥6 f; last burst ends ≥9 f. Holds 30–65 f.
- [ ] Holds move and glitch *into the product's code*, not generic noise.
- [ ] No text in the flood except code chips and found text in archive images. No captions, no tagline.
- [ ] Mark ≤ 8% of frame height, dead still, ≥ 2.5 s, on black (or the teaser card: one lockup, a tag, a URL — no tagline).
- [ ] Every image's licence is in `CREDITS.md`; nothing `nasa-check-credit` used without its credit.
- [ ] Sound: impact on each burst's first frame, glitch texture under each glitch-out, ping on the mark.
