# Decaya

Clap once in your room. Decaya measures how long the echo rings, works out which rug, curtain or duvet would fix it, and plays you the result before you buy anything.

> Live demo: https://decaya.vercel.app

Decaya is a browser tool for students who record in rooms that ring. You clap three times, Decaya measures the decay per octave band, predicts what a curtain, a duvet or a rug would change with Sabine's equation, and plays the same sentence through your room as it is and as it would be. The fieldbook on the home page holds ten illustrative example rooms (not measurements we took) next to any room you measure yourself, which stays in your own browser.

## The problem

Students record a lot from their rooms: podcasts, cover songs, voice assignments, online class presentations, YouTube. When it sounds bad, the microphone gets the blame and a new one gets ordered. Usually the mic is fine. The room is the problem. A dorm with a linoleum floor and painted cinder block keeps every word ringing for close to a second, and speech only sounds clear when that decay is under half a second.

The tools that measure this are either heavy (Room EQ Wizard wants a measurement microphone and a desktop) or iOS apps that hand you an RT60 number and stop (ClapIR, ClapReverb). A number does not answer what you actually want to know: what should I add to this room, and will I hear the difference?

## The solution

1. **Clap three times.** The browser records seven seconds with voice processing switched off, finds each clap, splits it into five octave bands (250 Hz to 4 kHz), integrates the energy backwards (Schroeder) and fits a 20 dB slope to get RT60 per band.
2. **Check the measurement.** Each clap is graded: clipped, too close to the noise floor (under 30 dB of range), or clean. You see "3 of 3 claps valid" and a confidence label, not just a number.
3. **Try furniture on it.** Enter the room size. Decaya solves Sabine's equation (RT60 = 0.161 V / A) backwards to find the absorption already in the room, then adds a thick curtain, a duvet on the wall, a rug, a bookshelf, a bean bag or a $79 foam pack and predicts the new decay per band.
4. **Listen before you buy.** Two impulse responses are synthesized from the measured and predicted decay times and run through a ConvolverNode on the same dry phrase. Tap "Your room now", then "With thick curtain + duvet on the wall". Same loudness, same noise, only the decay changes.

All measurement and audio work runs in the visitor's browser. The server only serves the seeded fieldbook; no account, no upload, no API key.

## What is real and what is a fixture

Real, in the browser: the whole Web Audio pipeline. Microphone capture (raw PCM through an AudioWorklet, with a MediaRecorder fallback that is flagged in the quality report), onset detection, the octave filter bank in an `OfflineAudioContext`, Schroeder integration, the T20 fit, clap grading, the Sabine prediction, the synthesized impulse responses and `ConvolverNode` playback. No AI model runs anywhere in the product.

Fixtures and stand-ins:

- The ten fieldbook rooms in `lib/data/seed.ts` are illustrative examples, not measurements we took.
- With `ADAPTER_MODE=fake` (the default), the clap button loads `fixtures/measurement.json`, a stored example dorm-room measurement, and the UI says "Sample data". With `ADAPTER_MODE=real` it uses your microphone and says "Live measurement". The switch is `getEngine(mode)` in `lib/engine.ts`.
- The dry voice in the A/B player is a formant synth until a CC0 anechoic speech clip is added at `public/audio/dry-speech.wav`. The player names the source it actually used.
- Rooms you measure are kept in your browser's localStorage through `lib/store.ts`; the server has no room store.
- If the microphone is blocked or no clap is found, "Use the sample measurement" loads the stored example instead; a room saved from it says "Sample data" in its notes.

What the model says, run over the too-live rooms in the seeded fieldbook: a free duvet hung off the wall cuts mid-band echo roughly three times more than a 12-pack of foam squares. Foam absorbs better per square meter, but twelve squares only cover about one square meter. Area wins.

## Required tech

This hackathon has no sponsor technology. The core is the Web Audio API:

- `getUserMedia` with `echoCancellation`, `noiseSuppression` and `autoGainControl` set to false (and a warning when the browser ignores that)
- `AudioWorklet` (`public/worklets/pcm-capture.js`) to copy raw PCM off the audio thread, so no codec touches the clap tail
- `AnalyserNode` for the live level meter while you clap
- `OfflineAudioContext` + `BiquadFilterNode` for the octave filter bank and impulse synthesis
- `ConvolverNode` for the before/after preview
- Canvas 2D for the decay curve

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS 4, shadcn-style primitives
- Motion 14 (`motion/react`) for the shared-layout room card expansion and the animated band bars
- Seed data served through one adapter (`lib/adapter.ts`, `ADAPTER_MODE=fake` or `real`) and small JSON routes under `/api`
- Zod 3 for route input and fixture validation (`lib/schemas.ts`)
- Node's built-in test runner through tsx for the unit tests
- Web Audio API and Canvas 2D, no audio libraries
- localStorage for rooms you measure (no backend)
- Vercel

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000. The microphone needs a secure context: `localhost` works, and so does any HTTPS deploy. No secret is needed. `ADAPTER_MODE` is the only setting (see `.env.example`): leave it unset for sample data, or set `ADAPTER_MODE=real` to measure with your microphone.

```bash
npm test        # unit tests on the pure acoustics functions, the schemas and the room store
npm run proof   # runs the core proofs and the tests, then rewrites the blocks below
```

Optional: drop a CC0 dry (anechoic) speech clip at `public/audio/dry-speech.wav` and the real engine uses it instead of the built-in formant synth.

### Reset the demo

1. `npm run demo:reset` rebuilds `fixtures/seed.json` twice in memory, stops if the two builds differ, writes it, and checks the fieldbook still has 10 rooms and 6 furnishings.
2. In the browser, open `/` and press "Clear rooms measured here" (or open a private window). Rooms you measured live only in that browser, so no script can reach them.
3. Walk `DEMO.md` from step 1.

No migration or schema push exists in this project (store: browser localStorage, `lib/store.ts`). Rooms are saved under the key `decaya.rooms.v1`; entries that fail the stored room schema are skipped when read, and saving the same room twice replaces it instead of adding a second one.

## How it was tested

The design choice we made up front: we fit T20 (-5 to -25 dB) instead of T30, because phone microphones rarely give 35 clean decibels above the noise floor.

The five blocks below are written by `npm run proof`. They are synthetic-signal checks, a model prediction, a storage check and a unit test result, not room measurements.

Unit tests (`tests/core.test.ts`, `tests/store.test.ts`):

<!-- PROOF:BEGIN tests -->
Run 2026-11-24: npm test passed 11 of 11 tests in tests/core.test.ts and tests/store.test.ts (node:test through tsx).
<!-- PROOF:END tests -->

T20 on a synthetic decay:

<!-- PROOF:BEGIN synthetic-decay -->
Run 2026-11-24: an ideal exponential decay with RT60 0.9 s (8000 Hz, no noise) went through schroederDb and t20 and read 0.900 s, an error of 0.00 percent.
<!-- PROOF:END synthetic-decay -->

Demo room prediction (3 x 4 x 2.6 m, thick curtain plus duvet on the wall):

<!-- PROOF:BEGIN demo-prediction -->
Run 2026-11-24: demo room 3 x 4 x 2.6 m with the fixture measurement (mid band 0.91 s). Predicted mid band with thick curtain + duvet on the wall: 0.47 s. This is a Sabine prediction, not a measurement.
<!-- PROOF:END demo-prediction -->

Dry voice source:

<!-- PROOF:BEGIN dry-voice -->
Run 2026-11-24: public/audio/dry-speech.wav is not present, so the A/B uses the formant synth voice.
<!-- PROOF:END dry-voice -->

Saved rooms (`lib/store.ts`, in-memory localStorage stand-in):

<!-- PROOF:BEGIN store -->
Run 2026-11-24: lib/store.ts with an in-memory localStorage. Saving the same slug twice left 1 room. A corrupt stored string did not throw and reported parse_failure. Of two stored entries, the one missing its band values was skipped (kept 1, skipped 1).
<!-- PROOF:END store -->

Room tests on real devices. We add these numbers by hand after measuring; no row is filled until it has been measured.

| What | How | Result |
| --- | --- | --- |
| Measurement sanity | Same phone, dorm room vs. tiled bathroom | Not measured yet |
| Clap grading | Clap right next to the phone on purpose | Not measured yet |
| Cross-check | Same 3 rooms measured with an iOS clap app | Not measured yet |
| Browsers | Chrome desktop, Safari iOS, Chrome Android | Not measured yet |

## What we would build next

- Measure from four spots in the room and average, the way acousticians do
- Early reflections in the synthetic impulse so the preview sounds more like the real room
- A shopping list view: the cheapest plan per room, with where to hang each item
- Optional shared fieldbook (Vercel KV) so a whole dorm floor can compare rooms

## Credits

- Absorption coefficients adapted from Beranek and from Everest's *Master Handbook of Acoustics*. Duvet, bookshelf and bean bag values are our estimates and are labelled that way in the app.
- Scene illustrations and logo are original SVGs drawn for this project.
- Dry voice: no recorded speech clip is included yet. The A/B player uses a formant synth written for this project (`lib/acoustics.ts`).

## AI use

We used AI coding assistants for scaffolding, boilerplate and parts of the implementation. Architecture, product decisions and final code review are our own. No AI model runs in the product: every number comes from the Web Audio pipeline and Sabine's equation in your browser.
