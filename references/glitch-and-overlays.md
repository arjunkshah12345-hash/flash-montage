# Glitch and overlays

All in `assets/procedural/glitch.js`; pure functions of `(source, k, seed)` so any frame renders alone.

## Code chips — `codeChips(ctx, k, seed, lines, {scale, dark})`

Translucent label boxes of source code. 70 chip slots per seed; `k` reveals them progressively (so chips
*accumulate* over a hold). ~18 % are large (22 px), the rest 13 px; each shows a random prefix of its line.
Light grounds: grey glass `rgba(160,170,180,.42)` with near-white text; dark grounds: `rgba(10,14,20,.55)`.
Use the product's real code in `plan.code` — the chips are the claim that the code made the image.

In flash shots the builder adds 2–7 static chips as HTML spans (`chip_share`, default 30 %).

## Macroblock — `macroblock(ctx, source, k, seed)`

Rectangles of the source copied to a sideways offset (up to 35 % of width × k), snapped to a 48 px grid,
55 % tinted pink / green / violet / white / ink, plus horizontal tear lines. Used for the origin's screen and
holds A/B over their last 10–14 f, with `k` ramping 0 → 1. Reseed every frame (`frame * 131 + 3`) so it boils.

## Chroma — `chroma(ctx, source, k, seed)`

The source downsampled by 4, R shifted left and B right by up to 9 % of width × k, G fixed, drawn back
unsmoothed (pixelated) once k > 0.5. The closing hold uses it over ~22 f; at k > 0.6 macroblocks join in.

## Composition in a hold

```js
const k = Math.max(0, (t - (holdDur - glitchDur)) / glitchDur);   // 0 until the glitch window
if (k > 0) glitchOut(gl, specimenCanvas, k, frame, { lines: CODE, mode: "block" | "chroma" });
else codeChips(gl, (t / holdDur) * 0.35, seed, CODE);               // chips accrue during the hold
```

The glitch draws on a second canvas over the specimen canvas; the specimen keeps rendering underneath.

## Don'ts

- No glitch on flash shots (the cut is the transition).
- No CRT scanline overlay on the whole film; scanlines live only inside the origin's screen texture.
- No CSS `filter` for glitch or grade (HyperFrames contract); canvas draws only.
- Registry alternatives if you want shader versions: `npx hyperframes catalog --query glitch` → `glitch`
  (shader transition), `rgb-glitch-text`, `caption-glitch-rgb`.
