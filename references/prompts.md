# Image-generation prompts for gaps

Use when the library lacks a subject (a specific product part, a brand-coloured specimen). One subject per
image, 16:9, no text. Append the **house suffix** to every prompt.

**House suffix:** `single subject centred, museum specimen photography, seamless studio sweep background, soft
large overhead softbox, gentle contact shadow, 85mm, f/8, ultra sharp, neutral colour, no text, no watermark,
16:9`

Dark variant: replace the background clause with `pure black background, rim light, subject glowing softly`.
Full-bleed variant: drop the sweep, `top-down aerial photograph, edge to edge, no horizon`.

| Family | Prompt (before the suffix) |
| --- | --- |
| Shells | `a nautilus shell cut in half showing pearlescent chambers` · `a spiral ammonite fossil, polished, iridescent nacre` · `a sea urchin test, pale green, perforated pattern` |
| Anatomy | `a complete whale skeleton suspended, bones ivory white` · `a human vertebral column laid horizontally, bone texture` · `a bird skeleton on a wooden museum stand` |
| Macro | `an extreme close-up of a horse's eye, wet reflection` · `a dragonfly wing, venation like stained glass, backlit` · `a human fingerprint ridges, raking light` |
| Botanical | `a single dandelion seed head, every filament crisp` · `an ancient twisted olive tree on a small mound of earth` · `a lotus seed pod, top view` |
| Creatures | `a red starfish, top view` · `a translucent jellyfish trailing long tentacles` · `a green caterpillar on a thin stem, side view` |
| Geology | `a geode split open, amethyst crystals` · `a polished agate slice with blue bands, backlit` · `layered rock strata, folded` |
| Machines | `an exploded view of a jet turbine, parts floating in a line along one axis, CAD render with thin blue dimension lines` · `a robotic hand, aluminium and black anodised parts, fingers slightly curled` · `a grid of 18 different screw heads, chrome, specimen sheet layout` · `a radio telescope dish, white, low angle` |
| Studio 3D | `a chrome torus with deep radial ribs` · `a ring made of hundreds of small glass beads` · `an iridescent liquid-metal blob, gold and violet thin-film` · `an inflatable glossy knot in red, yellow and violet on a salmon background` · `a glass DNA double helix` |
| Science viz | `streamlines of airflow around a turbine, coloured by velocity, white background` · `an x-ray wireframe flower, purple petals, yellow filaments, teal core` · `a 3D data terrain made of glowing green contour lines on black` |
| Drawings | `a page of Leonardo da Vinci style mechanical studies, sepia ink, mirror handwriting, aged paper` · `an architect's red pencil sketch of a spiral staircase on tracing paper` · `a blueprint of a machine part, white lines on blue` (expect garbled lettering — keep it ≤ 2 f) |
| Earth aerial | `top-down aerial of a multi-level highway interchange` · `top-down aerial of ocean waves breaking on dark sand` · `a hurricane eye seen from orbit` · `ice floes on dark water, top-down` |
| Cosmos | `a spiral galaxy, face-on, deep space` · `the moon during a partial lunar eclipse, copper shadow side, black sky` · `a black hole with a glowing accretion disk` |

**Hold prompts** (need motion → generate a short video or use a procedural specimen): `a glossy red sphere
disintegrating into fine red particles streaming to the right, white studio` · `an x-ray flower slowly rotating`
· `the full moon slowly rotating, black background`.

Batch tip: generate 4 per prompt, keep the one with the cleanest silhouette and the most negative space.
