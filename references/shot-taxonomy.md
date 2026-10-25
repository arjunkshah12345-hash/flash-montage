# Shot taxonomy

The library folders, what fills them, and the Kimi shots each one covers. `themes` in the plan weights them.

| Category (`assets/library/…`) | Kimi share | Kimi examples | Best grounds | Strong picks |
| --- | --- | --- | --- | --- |
| `shells-fossils` | part of 20 % nature | nautilus whole + section, chrome ammonite | light, dark | nautilus section, ammonite, sea-urchin test, trilobite |
| `anatomy-skeleton` | ↑ | whale skeleton, vertebrae, anatomical head, hand sketch | light | skeletons on white, Vesalius/da Vinci plates, skulls |
| `macro-eyes-skin` | ↑ | iris, horse eye, fingerprint, dragonfly wing | full-bleed, light | wing venation, compound eye, feathers |
| `botanical` | ↑ | dandelion clock, olive tree, blue flower, leaf veins | light | single plant isolated, herbarium sheets, Blossfeldt |
| `creatures` | ↑ | starfish, caterpillar, jellyfish, murmuration, sheep flock | light, dark | Haeckel plates, specimen drawers, jellyfish on black |
| `geology-ice` | ↑ | geode, ice floes, glacier, frost, strata | light, full-bleed | agate slices, minerals on white, meteorite etch |
| `machines-engineering` | 17 % | exploded turbine, jet engine, robot hand, screws, chip die, dish, truss | light | cutaways, watch movements, chips, dishes |
| `earth-aerial` | 15 % | waves, interchanges, circular building, hurricane, whirlpool | full-bleed | NASA Earth Observatory, aerial CC0 photos |
| `cosmos` | 9 % | galaxy, moon phases, eclipse, black hole, lightning | dark | NASA galaxies/nebulae, moon, Earth |
| `drawings-archive` | 9 % | da Vinci studies, architect sketches, blueprints | light (paper) | Codex pages, patents, Diderot plates, blueprints |
| `studio-objects` | part of 16 % | glass vessel, chrome ring | light, dark | Cleveland CC0 objects: glass, bronze, armour, instruments |
| `textures-full-bleed` | part of 15 % | water, cloud, strata | full-bleed | water, smoke, sand, marble — use sparingly between objects |
| `procedural` | 16 % 3D + 8 % sci-viz | chrome torus, bead ring, iridescent blob, clay swarm, wireframes, flow lines, data terrain | light, dark | 27 specimens × seeds (see below) |

## Procedural specimens (`assets/procedural/specimens.js`)

| Specimen | Ground | Kimi shot it echoes | Good as hold? |
| --- | --- | --- | --- |
| `particle-sphere` | light | red sphere shedding particles (hold A) | **yes** (animated disintegration) |
| `wire-flower` | grey | x-ray flower (hold B) | **yes** |
| `moon` | black | closing moon (hold C) | **yes** (with `chroma`) |
| `retro-terminal` | grey | the origin computer | origin only |
| `ribbed-torus` | light | chrome ribbed torus | yes |
| `bead-ring` | light | glass-bead ring | yes |
| `iridescent-blob` | light | iridescent blob / chrome pill | yes |
| `glass-dna` | light | glass DNA | yes |
| `candy-knot` | salmon | inflatable knot | flash |
| `clay-swarm` | light | candy clay shapes vortex | flash |
| `fuzzy-pill` | light | fuzzy chrome pill | flash |
| `wire-torus` | light | mesh torus | flash |
| `exploded-turbine` | light | exploded CAD | yes (explodes over t) |
| `galaxy`, `black-hole` | black | galaxy, black hole | yes |
| `jellyfish` | black | jellyfish / radiolarian fish | yes (tentacles sway) |
| `radial-lines` | white | radial line drawing | flash |
| `attractor-ribbons` | white | orbit ribbons | flash |
| `vascular-tree` | white | blue vascular tree | flash (grows) |
| `flow-lines` | white | CFD streamlines | flash |
| `blueprint` | paper | technical drawings | flash |
| `contour-terrain` | black | data terrain | flash |
| `nautilus-section` | black | nautilus section | flash |
| `swiss-poster` | white | Swiss/"7S" posters | flash |
| `code-sheet` | dark | code glitch inserts | insert only |
| `fastener-grid` | white | fastener specimen grid | flash |
| `frost-dendrite` | black | frost crystal | flash |
| `murmuration` | sky | starling murmuration | flash |

Every specimen is `make({canvas, w, h, seed, opts}) → { render(t) }`, deterministic in `(seed, t)`. Add one by
following any existing entry; keep it a pure function of `t` (HyperFrames seeks frames out of order).

## Sequencing heuristics

- Pair opposites at the fastest cuts: organic ↔ machined, tiny ↔ planetary, light ↔ dark, flat drawing ↔ glossy 3D.
- Put the most "wow" photographs (hurricane, nautilus section, jet engine) at 3–6 f, where they can be read.
- Put the strangest items (posters, code faces, collages) at 1–2 f, where they flicker.
- One "rhyme" per burst: two shots of the same shape in different worlds (torus → circular building → whirlpool).
