# Sound

Measured on the source (spectrogram + `scripts/onsets.py`): the sound marks **bursts**, not
cuts. Only 23 % of cuts sit within a frame of an audio onset.

## The score, as cues

| Moment | Source film | Builder default cue (`plan.audio.cues`) |
| --- | --- | --- |
| Origin | low hum swelling 60→70 Hz, terminal texture | `sfx:typing` at frame 8, vol 0.35 |
| Origin glitch-out | digital tear | `glitch:-1` → `sfx:glitch-3` |
| Burst start ×3 | a struck harmonic chord on frame 1 of the burst, decaying ~5 dB as cuts slow; each burst a new root (C/E → D/G → A/E) | `burst:i` → `sfx:impact-bass-1/2` |
| Hold glitch-outs | high ringing tone under the hold, then ~4 f of near-silence before the next burst | `glitch:i` → `sfx:glitch-1/3/2` |
| Mark | sub thump on the cut, one high ping (~C6, 1047 Hz), silence | `mark` → `sfx:ping` |

`sfx:<name>` resolves to the HyperFrames media-use bundled library (Pixabay licence: commercial use, no
attribution required). Any file path works too. Anchors: `origin`, `burst:<i>`, `glitch:<i>` (`-1` is the
origin), `mark`, `f:<frame>`; `offset` in frames.

## The bed (the chord)

The builder never synthesises music (HyperFrames house rule: no tones in code). Get a bed one of three ways:

1. The person's own track — best. Ask for something with three swells or re-edit so each swell hits a burst
   start (`burst:i` anchors are in `SHOTLIST.json` as frames).
2. `npx hyperframes media-use resolve --type bgm --intent "three struck ambient synth chords with long decay,
   no drums, cold, cinematic, 24 s" --project .` (HeyGen catalog when signed in; local MusicGen otherwise).
3. Openverse/Freesound CC0 "synth pad hit", "orchestral hit decay", "drone swell" via
   `media-use resolve --type sfx --intent "<name>"`, one per burst, placed with `burst:i` cues.

Set `plan.audio.bed` to the file; it is placed at 0 with `bed_volume` (default 0.8).

Shape it with `plan.audio.bed_shape` — `{"fade_in": 0.4, "inhale_frames": 5, "inhale_level": 0.06, "end": "mark",
"end_offset": 22, "end_frames": 24}` — and the builder writes a `data-automation` volume lane (inhale dips before
every burst after the first) plus a lowpass that sweeps 18 kHz → 220 Hz over the last `end_frames`, so the music is
sucked out as a teaser's wall compresses, leaving a few frames of silence before the reveal hit.

**Local bed without an account:** MusicGen-small runs on Apple MPS (~7 min per 30 s clip; 2.2 GB model download).
Prompt for a pulse, not a song: `dark cinematic electronic trailer score, pulsing deep sub bass, fast ticking
hi-hats, glitchy arpeggiated analog synth, building tension, 128 bpm, no vocals`. Generate 2–3, keep the one with
a steady loudness envelope and a section change near burst C. MusicGen output is 32 kHz and dark in the highs;
the bundled impacts and glitches supply the top end. **Licence:** the MusicGen weights are CC BY-NC 4.0 —
use a MusicGen bed for drafts and internal cuts; before a commercial launch swap in a licensed track (the person's,
the HeyGen catalog, or a CC0 piece).

**Measured SFX peaks** (bundled library, 30 fps frames from file start): `impact-bass-1` 2 · `impact-bass-2` 23 ·
`ping` 10 · `riser` crest ~90–120 then a cut (not at 10 s) · `whoosh-cinematic` swell ~66–87. Offset cues so the
peak lands one frame after its picture.

## Mix

- Impact peaks 3–6 dB over the bed; place a hit's peak one frame after its picture (`npx hyperframes audio
  <file> --json` reports where a file peaks).
- Duck everything to near-silence for the 4 frames before bursts B and C — the inhale is half the effect.
- Final mix −16 to −14 LUFS, true peak ≤ −1 dBTP: `npx hyperframes normalize-audio`, then measure the render
  with `npx hyperframes audio renders/<file>.mp4 --json`. Say in the delivery note that sound was measured, not heard.
