# Look: grounds, framing, colour

## Grounds (the single most important choice)

| Ground | Share | Values | Use for |
| --- | --- | --- | --- |
| Seamless light | ~45 % | `#e6e7ea`–`#f4f5f6` sweep, soft contact shadow under the object | studio 3D, specimens, machines, drawings |
| Seamless dark | ~20 % | `#000`–`#0d1015`, no visible floor | cosmos, glowing creatures, crystals, x-rays |
| Full-bleed | ~35 % | the image is the ground | aerials, water, ice, textures, crowds, macro |

The builder reads each library file's border (`manifest.jsonl → ground`) and fills the frame behind a
`contain`-fitted image with the image's own edge colour, so a portrait museum photo on grey becomes a 16:9
grey sweep. Full-bleed images use `cover`.

Sequence: steer toward the mix, never three of one ground in a row, and lean on light↔dark flips at the fastest
part of a burst: the flicker *is* the energy.

## Framing

- One subject, centred, 40–70 % of frame height. Off-centre only for things that stream (the particle sphere
  sits left of centre so its trail has room).
- Camera: nothing in 1–3 f shots; a 0.6 %/frame push (builder default) in shots ≥ 3 f; slow rotation in holds.
- Collages (~5 %): 3-panel or 2×2, white gutters 8 px, used only on 1–3 f shots.
- No people's faces as subjects (eyes, hands, fingerprints yes). It keeps the film about *things*.

## Colour

- Base: neutral greys, black, archive paper (`#f3f1ea`), museum beige.
- Accents: one saturated hue per frame — signal red `#a50f16`/`#d42a2a`, cobalt `#1d3fbf`, orange `#f0571f`,
  teal `#48d6c8`, iridescent. Accent shots every 3–6 shots, never two reds back to back.
- No global grade on the flood (it would homogenise the cabinet). If a grade is needed, go through
  `npx hyperframes media-treatment`, never CSS filters.

## Type

- None in the flood except code chips and text that exists in the source (archive lettering, posters).
- The mark: geometric/grotesque caps, 5–7 % of frame height, white on black, letter-spacing +0.02–0.04 em.
  Bundled options: Archivo Black, Inter 600–700, Outfit, Montserrat. Brand font → `@font-face` in `mark.html`.

## Origin device

The product rendered as a physical, slightly nostalgic object: a beige 1980s computer (default
`retro-terminal` specimen, configurable product name, prompt, info rows and code). Alternatives to write as
specimens: a CRT TV, a pocket calculator, a lab notebook, a phone on a seamless sweep, a robot arm typing.
Push in from object-and-desk to screen-fills-frame over ~2.2 s (ease-out), then tear the screen.
