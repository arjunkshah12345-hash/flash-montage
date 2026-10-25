# Asset directory

Two halves: what is already **on disk** in this skill, and the **open sources** to pull more from.
Licence rule for anything that ships: CC0 / public domain first; CC BY only with the credit in `CREDITS.md`;
never NC / ND / SA in a commercial launch film. Licences below are the collection's default — verify per item
(the fetcher records each file's licence and source page in `assets/library/manifest.jsonl`).

## On disk

| Path | What | Count |
| --- | --- | --- |
| `assets/library/<category>/` | photos, scans, plates, NASA imagery; 1600 px max, JPEG q84, `thumbs/` at 320 px. Not in the skill repo: `python3 -I scripts/get_library.py` downloads it from [flash-montage-library](https://github.com/arjunkshah12345-hash/flash-montage-library) | 827 curated |
| `assets/library/procedural/` | stills of the 27 flash specimens × 6 seeds, 1920×1080 | 162 |
| `assets/library/manifest.jsonl` | one record per file: title, creator, licence, licence_url, source page, provider, w/h, aspect, ground (`seamless-light` / `seamless-dark` / `full-bleed`), ground_luma, 4-colour palette, saturation, query | — |
| `assets/library/rejects.txt` | curated-out files (people-centred, toys, food, documents, near-blank, duplicates); the builder and the index skip them | ~340 |
| `assets/library/INDEX.html` / `INDEX.md` / `_sheets/` | gallery with licence on hover and filters; counts; numbered contact sheets per category for visual curation | — |
| `assets/procedural/` | `specimens.js` (28 specimens), `glitch.js`, `lab.html`, vendored Three.js r184 + RoomEnvironment (MIT) | — |
| `references/data/` | the teardown data: cut lists for Kimi K3.1, K3 and K2.6 films | — |

Grow / refresh:

```bash
python3 -I scripts/fetch_assets.py                                   # every query in assets/sources/queries.json (cached)
python3 -I scripts/fetch_assets.py --only cosmos,botanical
python3 -I scripts/fetch_assets.py --query "orrery" --category machines-engineering --source commons --per 20
python3 -I scripts/render_specimens.py --seeds 12 --only moon,galaxy  # more procedural stills
python3 -I scripts/make_index.py                                     # sheets + gallery; then Read sheets, append rejects
```

Sources wired into `fetch_assets.py`: **Openverse** (`license=cc0,pdm`; anon 20 req/min, 200/day — responses
cached in `assets/sources/cache/`), **NASA Image Library**, **Wikimedia Commons** (files whose licence is public
domain / CC0 only; 1280 px thumbs, one serial lane), **Cleveland Museum of Art** (`cc0=1`).

## Open sources by shot family

### Aggregators (search everything at once)

| Source | Licence | Access | Notes |
| --- | --- | --- | --- |
| [Openverse](https://openverse.org) | filter `cc0`, `pdm` | API, no key (anon limits) | 800 M+ items from Flickr, Smithsonian, Met, museums, rawpixel, StockSnap; the fetcher's backbone |
| [Wikimedia Commons](https://commons.wikimedia.org) | per file; many PD | MediaWiki API | Best for archive plates, da Vinci, Haeckel, Blossfeldt, patents, anatomy atlases |
| [Smithsonian Open Access](https://www.si.edu/openaccess) | CC0 | `api.si.edu` (api.data.gov key; `DEMO_KEY` for tests) | 5 M+ 2D and 3D: specimens, aircraft, Apollo, fossils |
| [Flickr Commons](https://www.flickr.com/commons) | "no known copyright restrictions" | Flickr API | Institutional archives (LoC, BHL, NASA, museums) |
| [Biodiversity Heritage Library](https://www.flickr.com/photos/biodivlibrary/) | public domain | Flickr | 300 k+ natural-history plates: shells, insects, birds, botany |
| [Library of Congress](https://www.loc.gov/free-to-use/) | free to use sets | loc.gov JSON API | Engineering drawings (HAER), aerials, patents |
| [rawpixel public domain](https://www.rawpixel.com/category/53/public-domain) | CC0 | site | Cleaned-up scans of vintage plates and posters |
| [Internet Archive](https://archive.org) | varies; PD texts | API | Scanned books for plates; Prelinger films (PD) for full-bleed footage |
| [Europeana](https://www.europeana.eu) | filter `reusability=open` | API key (free) | European museums and archives |

### Museums (CC0 object photography on seamless grounds — the "studio object" look)

| Source | Licence | Access |
| --- | --- | --- |
| [Cleveland Museum of Art](https://openaccess-api.clevelandart.org) | CC0 | API, no key (wired in) |
| [The Met Open Access](https://metmuseum.github.io/) | CC0 | `collectionapi.metmuseum.org/public/collection/v1.1/` (v1 search retired Oct 2026) |
| [Art Institute of Chicago](https://api.artic.edu/docs/) | CC0 (public-domain works) | API + IIIF, no key |
| [Rijksmuseum](https://data.rijksmuseum.nl) | CC0 | API key |
| [National Gallery of Art](https://github.com/NationalGalleryOfArt/opendata) | CC0 | dataset + IIIF |
| [SMK – National Gallery of Denmark](https://open.smk.dk) | CC0 | API, no key |
| [Paris Musées](https://parismuseescollections.paris.fr/en/open-content) | CC0 | API |
| [Getty Open Content](https://www.getty.edu/projects/open-content-program/) | PD / CC0 | site, IIIF |
| [Natural History Museum London](https://data.nhm.ac.uk) | CC0 data, images CC BY | data portal API |
| [Museums Victoria](https://collections.museumsvictoria.com.au/api) | PD / CC BY | API |
| [Wellcome Collection](https://wellcomecollection.org/works) | PD / CC BY | catalogue API, IIIF — anatomy, medicine, microscopy |

### Cosmos, earth, science

| Source | Licence | Notes |
| --- | --- | --- |
| [NASA Image and Video Library](https://images.nasa.gov) | generally PD | wired in; items credited to ESA/others flagged `nasa-check-credit` |
| [NASA Earth Observatory](https://earthobservatory.nasa.gov/images) | generally PD | hurricanes, blooms, glaciers, deltas — the aerial beat |
| [USGS EROS "Earth as Art"](https://www.usgs.gov/centers/eros/science/earth-art) | PD | Landsat abstracts |
| [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov) | generally PD | animated full-bleed science (currents, sun, moon) |
| [JPL Photojournal](https://photojournal.jpl.nasa.gov) | generally PD | planets, rovers |
| [Solar Dynamics Observatory](https://sdo.gsfc.nasa.gov/data/) | PD | sun in multiple wavelengths |
| [ESA/Hubble](https://esahubble.org/copyright/), [ESA/Webb](https://esawebb.org/copyright/) | CC BY 4.0 | best galaxy/nebula frames — credit required |
| [NOAA Photo Library](https://photolib.noaa.gov) | PD | weather, ocean, ice |
| [RCSB PDB](https://www.rcsb.org) + [Mol*](https://molstar.org) | data CC0 | render protein ribbons / DNA yourself |
| [NIH 3D](https://3d.nih.gov) | CC0 / CC BY per model | anatomy, molecules |
| [CDC Public Health Image Library](https://phil.cdc.gov) | mostly PD | micrographs |

### 3D models, textures, HDRIs (to render studio objects in Three.js)

| Source | Licence | Notes |
| --- | --- | --- |
| [Poly Haven](https://polyhaven.com) | CC0 | 500+ models, HDRIs, textures; API `api.polyhaven.com` |
| [Smithsonian 3D](https://3d.si.edu) | CC0 | whale skeletons, fossils, Apollo, Wright Flyer scans |
| [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources) | generally PD | spacecraft, asteroids |
| [ambientCG](https://ambientcg.com) | CC0 | PBR materials |
| [Kenney](https://kenney.nl/assets), [Quaternius](https://quaternius.com) | CC0 | stylised props |
| [Sketchfab](https://sketchfab.com/search?features=downloadable&licenses=7c23a1ba438d4306920229c12afcb5f9&type=models) | filter CC0 | scanned specimens, machines |
| [Google Scanned Objects](https://app.gazebosim.org/GoogleResearch/fuel/collections/Scanned%20Objects%20by%20Google%20Research) | CC BY 4.0 | 1,000+ household scans — credit required |

### Archive drawings and plates

| Source | Notes |
| --- | --- |
| Leonardo da Vinci notebooks (Commons, Royal Collection scans) | PD artworks; use reproductions marked PD |
| [USPTO / Google Patents](https://patents.google.com) | patent drawings, PD in the US |
| [Diderot Encyclopédie plates (ARTFL)](https://encyclopedie.uchicago.edu) | machines, trades, anatomy |
| Ernst Haeckel, *Kunstformen der Natur* (Commons category) | radiolaria, jellyfish, shells — wired in |
| Karl Blossfeldt, *Urformen der Kunst* | plant forms; PD in most jurisdictions — check yours |
| [HathiTrust](https://www.hathitrust.org) | full-view PD books for plates |

### Footage (moving full-bleed shots)

| Source | Licence | Notes |
| --- | --- | --- |
| NASA SVS / NASA video | generally PD | aerial earth, sun, simulations |
| [Prelinger Archives](https://archive.org/details/prelinger) | PD | industrial and science film |
| [Pexels Videos](https://www.pexels.com/videos/), [Pixabay Videos](https://pixabay.com/videos/) | own free licences (commercial OK, not CC0) | API keys; aerials, water, macro |

Footage in a 1–6 f shot reads as a still; use it for holds or ≥ 6 f shots, muted (`muted playsinline`).

### Sound

Bundled HyperFrames media-use SFX (Pixabay licence) via `sfx:<name>`; Openverse/Freesound CC0 via
`npx hyperframes media-use resolve --type sfx`; music via `--type bgm`. See `sound.md`.

### Generated imagery

For gaps (a specific machine, a fake specimen sheet), generate with an image model using `prompts.md`.
Check the provider's output terms; label generated frames in `CREDITS.md`. The source film appears to mix
generated frames in (garbled lettering on its blueprint shot); keep generated ≤ half of the flood so the "real
world" read survives.
