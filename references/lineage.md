# Lineage: where the flash montage comes from

Use this to brief a person on references, or to pick a variant. The Kimi K3.1 teaser (Oct 2026) is the trigger
for the current wave; it stands on a long line of "flood the eye" films.

## Direct ancestors

| Work | Year | What it contributes | Notes |
| --- | --- | --- | --- |
| Charles & Ray Eames, *Glimpses of the U.S.A.* | 1959 | The image flood as argument: 2,200+ stills and clips on seven 20–30 ft screens in Fuller's geodesic dome, Moscow, ~12 min, USIA-commissioned; ~3 M visitors in six weeks | [Eames Foundation](https://eamesfoundation.org/work/glimpses-of-the-u-s-a-film/), [Library of Congress](https://loc.gov/exhibits/eames/culture.html) |
| Eames, *Powers of Ten* | 1977 | Scale as structure (×10 every 10 s); the moon/cosmos ending as the "zoom out" | [Icon](https://www.iconeye.com/design/powers-of-ten) |
| Godfrey Reggio, *Koyaanisqatsi* | 1982 | Wordless montage of natural and built worlds, time-lapse aerials, music as the narrator; its look seeded decades of ads | [Wikipedia](https://en.wikipedia.org/wiki/Koyaanisqatsi), [MetaFilter thread on its commercial afterlife](https://metafilter.com/158547/the-appropriation-of-his-aesthetic-by-others-for-commercial-means) |
| Dziga Vertov, *Man with a Movie Camera* | 1929 | The accelerating cut as climax: shot lengths shrink to single frames | classic film-school reference |
| Wunderkammer / cabinet of curiosities | 16th–17th c. | The *subject list*: shells, skeletons, instruments, minerals, drawings — the encyclopaedia as spectacle | the subject families in `shot-taxonomy.md` are the cabinet's drawers |
| Museum open-access + Are.na moodboards | 2010s– | The *look*: objects on neutral grounds, archive plates, specimen sheets | the reason the library leans on CC0 museum collections |

## Internet-native cousins

| Format | What it is | Difference from the flash montage |
| --- | --- | --- |
| **corecore** (TikTok, from July 2022) | Out-of-context clips (news, films, memes) stitched over somber music to produce feeling by juxtaposition, ~15 s | Emotional, found footage, people and faces; the flash montage is objects and specimens, cool and curatorial. [Vice](https://www.vice.com/en/article/corecore-tiktok-trend-explained), [Artnet](https://news.artnet.com/art-world/corecore-tiktok-explainer-2250235) |
| **chaos edit / nichetok** | Fast, noisy, meme-paced edits | No curation; the flash montage is strict about grounds, centring and one subject |
| **flash-cut recap reels** (Instagram, 2026) | A day/trip/season compressed into rapid cuts | Personal and chronological; the flash montage is encyclopaedic |
| **Speed-ramp hype edits** | Cuts locked to every beat of a track | The flash montage is *not* beat-locked: sound marks bursts, picture keeps its own deceleration |

## AI-lab lineage

- **Moonshot's own films before K3.1** were the opposite: *Meet Kimi K3* (Jul 2026, 57 s) and *Meet Kimi K2.6*
  (44 s) run at ~0.5 cuts/s — captioned demos of games, a watch, a typewriter (measured: `data/kimi-k3-meet-cuts.json`,
  `data/kimi-k26-meet-cuts.json`). K3.1 swapped demo for *breadth*.
- A reply under the teaser joked it "distilled Claude's trailers" — the wider pattern of AI-lab brand films using
  archival/scientific imagery and minimal type rather than UI demos. Treat the comparison as vibes, not
  documented influence.
- The mark convention (black, tiny wordmark, silence) is shared with most lab teasers; it reads as confidence.

## Variants worth offering

1. **Classic (Kimi):** origin device → 3 bursts → moon → mark. The default plan.
2. **Powers-of-ten:** order the flood by scale (cell → hand → city → planet → galaxy) and end on the smallest or
   the largest thing. Use `themes` weights per burst by building three plans and concatenating, or reorder
   `SHOTLIST.json` and re-emit.
3. **Single-family:** one category only (all machines, all botanical plates) at the same rhythm — reads as a
   collection, good for a vertical product (bio, hardware, maps).
4. **Brand colour flood:** every seamless ground re-tinted to the brand's paper colour, accents kept; the mark in
   brand colour. Set `ground_mix` toward seamless-light and use `media-treatment` for tint, never CSS filters.
5. **Vertical 9:16:** same timing; the library's seamless shots survive `contain`, full-bleed shots crop well.
