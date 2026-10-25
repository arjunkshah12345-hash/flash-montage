# Timing: the burst curve

## Model

Within a burst of `n` shots, shot `i` lasts

```
d(i) = a + (b − a) · (i / (n − 1))^p          frames, continuous
cut boundaries = round(cumulative sum of d)     so 1.5 f alternates 2,1,2,1 and nothing drifts
```

`a` = fastest frames/shot (start), `b` = slowest (end), `p` = how long it stays fast (higher = fast for longer,
then a steeper slowdown). Total frames ≈ `n · (a + (b − a)/(p + 1))`.

| Burst (Kimi) | n | a | b | p | Builder total | Measured |
| --- | --- | --- | --- | --- | --- | --- |
| A | 48 | 1.5 | 6 | 2.6 | 133 f | 127 f |
| B | 35 | 1.8 | 6 | 2.5 | 106 f | 101 f |
| C | 71 | 1.0 | 11 | 4.0 | 216 f | 207 f |

Holds: 30, 34, 63 f. Origin 67 f. Mark 92 f. Total ≈ 24.6 s (measured 24.03 s).

## Rules that keep it from feeling generated

- **Each burst restarts fast.** Never ease *into* a burst; the first frame after a hold is the fastest cut.
- **Later bursts are faster and longer.** C's opening run of single frames is the peak of the film.
- **The last burst decelerates further** (to 9–11 f) so the final hold arrives as a landing, not a stop.
- **Holds have their own clock:** 1–2 s, motion inside (rotation 0.1–0.4 rad/s, particle drift), glitch-out
  over the last 10–22 f.
- **Single frames are fine at 30 fps** (33 ms). At 24 fps raise `a` by ~20%; at 60 fps double every number.
- **No cut lands on a beat on purpose.** Put the impact on each burst's first frame; let the pictures run free.

## Re-timing for other lengths

| Length | Origin | Bursts (n / a→b / p) | Holds | Mark |
| --- | --- | --- | --- | --- |
| 6 s bumper | — | 1 × 40 / 1→6 / 3 | 1 × 30 f | 45 f |
| 15 s | 45 f | 30 / 1.5→6 / 2.5 · 50 / 1→10 / 3.5 | 30 f, 50 f | 75 f |
| 24 s (Kimi) | 67 f | 48 / 1.5→6 · 35 / 1.8→6 · 71 / 1→11 | 30, 34, 63 f | 92 f |
| 45 s | 90 f | 4–5 bursts of 40–80 shots; vary `p` 2.2–4 | 30–60 f each, one 90 f | 120 f |

Over ~30 s the eye tires: add a mid-film beat with words (one line, 0.4 s) or a second origin device, not more
bursts at the same rate.

## Measured comparison

| Film | Cuts/s | Median shot |
| --- | --- | --- |
| Kimi K3.1 teaser | 6.56 | 2 f |
| Meet Kimi K3 | 0.46 | 41 f |
| Meet Kimi K2.6 | 0.50 | 39 f |
| HyperFrames "montage" default (motion.md) | 1.25–7.7 | 4–24 f |
