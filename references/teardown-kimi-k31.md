# Teardown: Kimi K3.1 teaser (Moonshot AI, 23 Oct 2026)

Source: `x.com/Kimi_Moonshot/status/2113445757185606062` — 24.03 s, 1920×1080, 30 fps, AAC 128k.
At analysis time (24 Oct): ~2.14 M views, 20.3 k likes, 1.4 k reposts, within ~30 h. No caption beyond a link.
Coverage called it a pre-launch signal for K3.1 (the terminal reads `Model: Kimi K3.1`); one reply joked it
"distilled Claude's trailers". Moonshot's earlier films (*Meet Kimi K3*, 57 s, 26 M YouTube views; *Meet Kimi
K2.6*, 44 s) are slow captioned demos at ~0.5 cuts/s — the flash format is new for them with K3.1.

Data in `data/`: `kimi-k31-cuts.json` (every shot, start time, length in frames). Reproduce with
`scripts/analyze_cuts.py <video> <outdir>` and `scripts/onsets.py <wav> <cuts.json>`.

## Numbers

| Measure | Value |
| --- | --- |
| Shots | 159 (158 cuts, ffmpeg scene > 0.2) |
| Cut rate | 6.56 cuts/s overall; ~11/s inside burst C |
| Median shot | **2 frames** (67 ms) |
| Shots ≤ 2 f / ≤ 4 f | 80 / 135 |
| Holds ≥ 24 f | 5: origin 67 f, hold A 30 f, hold B 34 f, hold C 63 f, mark 92 f (picture ends 24.03 s; audio tail to 24.09 s) |
| Cuts on an audio onset (±1 f) | 23 % — the edit is **not** beat-matched |

## Structure, frame by frame

| t (s) | Frames | Beat |
| --- | --- | --- |
| 0.00–2.23 | 67 | **Origin.** Beige late-80s computer (CRT monitor on a desktop unit with a floppy slot, keyboard) on a pale grey sweep. Terminal: `Welcome to Kimi Code!`, `Directory /Users/moonshot`, `Model: Kimi K3.1`, prompt `Build a complex procedural 3D scene in Three.js.`, then `● Using Write (./scene.js)` and a `SETTINGS` object (`seed: 73109, terrainResolution: 110, filamentCount: 180, towerCount: 300, particleCount: 9000…`). Slow push-in from monitor+keyboard to screen-fills-frame. From ~1.7 s the screen tears into green/red/purple macroblocks of code. |
| 2.23–6.47 | 127 | **Burst A**, 48 shots: 2,1,2,1,2,4,2,2,2,2,2,2,1,3,1,2,1,2,1,2,2,1,2,2,2,4,3,3,2,2,2,3,2,3,2,6,3,3,3,4,4,3,4,5,4,5,5,6 |
| 6.47–7.47 | 30 | **Hold A.** Glossy red sphere shedding a stream of red particles to the right, pale ground. Code chips accrue; last ~10 f macroblock datamosh in red/purple with large code text. |
| 7.47–10.83 | 101 | **Burst B**, 35 shots: 2,1,3,3,3,1,2,3,2,2,3,2,2,2,2,2,3,2,2,3,2,3,3,3,3,3,3,4,4,4,4,4,5,5,6 |
| 10.83–11.97 | 34 | **Hold B.** X-ray/wireframe flower (purple petals, yellow & lilac filaments, teal core) on grey; chips thicken, block glitch. |
| 11.97–18.87 | 207 | **Burst C**, 71 shots: 1,1,1,1,2,2,1,1,1,2,1,1,1,4,1,1,1,2,2,1,1,3,1,3,3,1,2,3,3,3,2,2,1,2,2,2,2,2,2,2,2,2,3,2,3,2,3,2,3,3,3,3,3,3,4,3,4,4,4,5,4,5,5,6,6,7,7,7,9,9,11 |
| 18.87–20.97 | 63 | **Hold C.** The moon on black (lunar-eclipse copper on the shadow side), still; from ~20.3 s green/cyan colour bleed, a horizontal tear, then a full R/G/B split into three offset discs, pixelated. |
| 20.97–24.03 | 92 | **Mark.** Black. `KIMI` white, geometric caps, ~65 px tall (6% of height), centred, dead still. |

Each burst is a **ritardando**: fastest at its start, slowing into its hold. Each burst is longer and its fast
end faster than the previous (A starts 2-1-2, C starts with four single frames). The film's total speed
envelope is three "inhales".

## What is on screen (159 shots, by eye)

Subjects never repeat a category back-to-back. Approximate shares across the flash shots:

| Family | ~Share | Seen |
| --- | --- | --- |
| Nature specimens | 20 % | nautilus (whole + section), whale skeleton (wireframe), vertebral column, dragonfly wing, starfish, caterpillar, dandelion clock, olive tree, leaf veins, blue flower macro, frost dendrite, coral, jellyfish, fish (x-ray), seed pod, horse eye, human iris, fingerprint, heart (scribble + flow) |
| Machines & engineering | 17 % | exploded turbine CAD (with blue dimension lines), jet engine, rocket engine, robot hands (×2), screws, fastener specimen grid, chip die, radio telescope dish, steel truss bridge, space-frame, engine parts on white, gearbox |
| Earth / aerial | 15 % | cloud over sea, ocean waves from above, highway interchange (×2), circular building, city grid collage, ice floes, glacier edge, crowd shadows, sheep flock, hurricane, whirlpool, river of pink flowers through forest, desert sinkhole, rock strata, intersection, light-trail highways |
| Studio 3D objects | 16 % | chrome ribbed torus, glass-bead ring, iridescent blob, inflatable knot, candy clay swarm, fuzzy chrome pill, glass DNA, glass vessel with red liquid, chrome ring floating on sea, chrome swirl, Earth as a liquid torus, Blender-donut, wireframe torus |
| Cosmos & weather | 9 % | spiral galaxy, moon phases (×2), lunar eclipse, Earth, black hole, lightning (×2), thunderhead |
| Drawings & archive | 9 % | da Vinci-style mechanical studies, architect's red-pen stair sketch, botanical ink studies, anatomical head with construction lines, sketched hand, blueprints (one with AI-garbled lettering — evidence much of the flood is generated imagery), radial line drawing |
| Science visualisation | 8 % | streamlines around a turbine, x-ray flower, protein ribbon/DNA, data terrain, eye HUD with code panels, forest with a line chart over it, vascular tree |
| Graphic / code / collage | 6 % | Swiss poster (orange bar, blue rule stack), "7S" type poster with orange paint, code-sheet glitches, 2×2 and 3-panel collages, a face dissolving into green code |

**Grounds:** roughly 45 % pale seamless (#e6e7ea-ish), 20 % black, 35 % full-bleed. **Colour:** mostly neutral,
with one saturated accent per frame (red, cobalt, orange, teal) — the accents punctuate.
**Framing:** a single subject, centred, occupying 40–70 % of frame height; little camera motion inside 1–3 f
shots; a slow drift/rotation in shots ≥ 4 f.

## Overlays

- **Code chips.** On ~30 % of flash shots and building through every hold: monospaced Three.js fragments
  (`new THREE.Color(0xe3c791)`, `mesh.instanceMatrix…`, `SETTINGS.terrainResolution`, `sculpture.add(mesh)`) in
  small translucent grey (light grounds) or dark (dark grounds) label boxes, ~13 px; at glitch peaks some chips
  grow to ~22 px with line numbers. They are the product's own output — the montage is "what the code made".
- **Glitch.** Macroblock displacement (blocks of the frame shifted sideways, tinted pink/green/purple) on the
  origin and holds A/B; RGB channel separation with pixelation on hold C. Never on flash shots.

## Sound (from the spectrogram and onset analysis)

- 0–2.2 s: low hum rising (~60–70 Hz), keyboard/terminal texture.
- Each burst opens with a **struck harmonic chord** on its first frame (burst A roots ≈ C3/E3, B ≈ D3/G3,
  C ≈ A2/E3), dense stacked partials up to ~8 kHz, loudest at the onset (−18.5 dBFS RMS) and decaying ~5 dB as
  the cuts slow. Stepped partials suggest a sequenced arpeggio or sonified blips under the chord.
- Each hold carries a higher ringing tone (~250–300 Hz) and ends in **near-silence** (~4 f) — the inhale before
  the next burst.
- Mark: a sub thump (~85 Hz) on the cut, then one high ping (~1047 Hz, C6) and silence to the end.

## Why it works

1. **Proof by breadth.** No claims, no benchmarks: 150 subjects in 17 s say "general". The frames are too short
   to read individually, so the viewer reads the *set*.
2. **Rewatch loop.** At 1–2 frames nobody sees everything; people scrub, screenshot and post favourites.
3. **Tension and release.** Fast → slow → hold three times is a breathing pattern; the final hold + silence + tiny
   mark is the exhale.
4. **Taste signals.** Seamless sweeps, museum specimens, archive drawings, chrome — the codes of design-world
   moodboards (Are.na, museum open-access collections) — not stock-video energy.
5. **Product is the cause.** The origin (a prompt typed into the product) and the code chips frame every image as
   output, without saying so.
