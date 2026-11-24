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

What the model says, run over the too-live rooms in the seeded fieldbook: a free duvet hung off the wall cuts mid-band echo roughly three times more than a 12-pack of foam squares. Foam absorbs better per square meter, but twelve squares only cover about one square meter. Area wins.

## Required tech

This hackathon has no sponsor technology. The core is the Web Audio API:

- `getUserMedia` with `echoCancellation`, `noiseSuppression` and `autoGainControl` set to false (and a warning when the browser ignores that)
- `AnalyserNode` for the live level meter while you clap
- `OfflineAudioContext` + `BiquadFilterNode` for the octave filter bank and impulse synthesis
- `ConvolverNode` for the before/after preview
- Canvas 2D for the decay curve

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS 4, shadcn-style primitives
- Motion 14 (`motion/react`) for the shared-layout room card expansion and the animated band bars
- Seed data served through one adapter (`lib/adapter.ts`, `ADAPTER_MODE=fake`) and small JSON routes under `/api`
- Web Audio API and Canvas 2D, no audio libraries
- localStorage for rooms you measure (no backend)
- Vercel

## Quickstart

```bash
npm install
npm run dev
```

Open http://localhost:3000. The microphone needs a secure context: `localhost` works, and so does any HTTPS deploy. No environment variables are needed (see `.env.example`).

Optional: drop a CC0 dry (anechoic) speech clip at `public/audio/dry-speech.wav` and the A/B player uses it instead of the built-in formant synth. Credit its source here.

## How we tested it

The design choice we made up front: we fit T20 (-5 to -25 dB) instead of T30, because phone microphones rarely give 35 clean decibels above the noise floor. The table below is the test log; the rows get filled with real measurements during the event.

| What | How | Result |
| --- | --- | --- |
| Measurement sanity | Same phone, dorm room vs. tiled bathroom | (to fill) |
| Clap grading | Clap right next to the phone on purpose | (to fill) |
| Cross-check | Same 3 rooms measured with an iOS clap app | (to fill) |
| Browsers | Chrome desktop, Safari iOS, Chrome Android | (to fill) |

## What we would build next

- Measure from four spots in the room and average, the way acousticians do
- Early reflections in the synthetic impulse so the preview sounds more like the real room
- A shopping list view: the cheapest plan per room, with where to hang each item
- Optional shared fieldbook (Vercel KV) so a whole dorm floor can compare rooms

## Credits

- Absorption coefficients adapted from Beranek and from Everest's *Master Handbook of Acoustics*. Duvet, bookshelf and bean bag values are our estimates and are labelled that way in the app.
- Scene illustrations and logo are original SVGs drawn for this project.

## AI use

<!-- Adjust this section to each hackathon's disclosure rules. -->

We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
