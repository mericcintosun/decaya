# HANDOFF: Decaya

You are picking up a working Next.js 15 scaffold. Read this file, then `IDENTITY.md`, then start on the Mission list. Keep `npm run build` passing after every change.

## 1. Context

**Product:** Decaya. Clap once in your room: Decaya measures how long the echo rings, works out which rug or curtain would fix it, and plays you the result before you buy anything.

**Pitch:** If you record a podcast, a cover song or an online class from a dorm room, your voice often sounds like you are talking in a bathroom. Open Decaya on a phone or laptop, clap a few times in the middle of the room, and see how much the room rings. Then pick items from a list (rug, thick curtain, bookshelf, a duvet on the wall) and Decaya calculates how much each one cuts the echo. One tap plays the same sentence in your room as it is and in the room as it would be. You find out whether an old duvet does the job of an $80 foam pack before you spend anything.

**Hackathon:** Peninsula Innovation Hackathon (Devpost, organized by bayhacks, online, students only).
**Deadline:** 10 December 2026, 17:00 EST (22:00 UTC).
**Target track:** 1st Place (the single submission is ranked automatically for 1st through 5th; prizes are non-cash placement recognition). No sponsor tech, no bounties.

**Judging criteria (weights unpublished):**
- Originality: how thoughtfully does the project approach its problem?
- Execution: how well does the demo show the core feature working?
- Usefulness and experience: how well does it serve its audience?
- Clarity and iteration: does the submission explain what was built, tested and improved?

**Submission requirements (verified):**
1. Project title and a short description of the problem or creative goal.
2. A demo, screenshots, or a walkthrough of the core feature.
3. A viewable project link if possible, plus a list of tools and materials used.
4. Team roles and a short note on what was built during the event.

**Rules to respect:** the project must be built during the event; reused code, assets and datasets must be credited with enough evidence for judges; AI tools used must be disclosed (README "AI use" section).

## 2. Current state

Identity: see IDENTITY.md (direction D6, structure S5, archetype L4, kit K1)

### Route map (Structure S5 explorer-detail)

| Route | File | What it shows |
| --- | --- | --- |
| `/` | `app/page.tsx` (+ `components/home-bento.tsx`, `components/room-explorer.tsx`) | L4 bento hero with the live furnishing preview, then the fieldbook of 10 seeded rooms with search and filters in the URL (`?q=`, `?type=`, `?verdict=`) |
| `/rooms/[slug]` | `app/rooms/[slug]/page.tsx` (+ `components/room-bench.tsx`) | The bench: specimen header, canvas decay curve, band bars, furnishing simulator, A/B listening (wow moment), re-measure |
| `/new` | `app/new/page.tsx` (+ `components/new-room-form.tsx`) | Label the room, clap three times, save. The room appears at the top of `/` immediately (localStorage) |
| `/about` | `app/about/page.tsx` | Method pipeline, absorption coefficient table, honest limits |

Navigation: header links Rooms (`/`), Measure a room (`/new`), Method (`/about`). Detail pages are reached from each fieldbook row (title link, Quick look, Open the bench) and from the bento.

### File map

- `lib/acoustics.ts`: all the science. `predictRt60` (Sabine inverse plus forward), `bestFix` (cheapest subset that lands 0.3 to 0.5 s), `schroederDb` + `t20`, `analyzeRecording` (onset detection, octave filtering in OfflineAudioContext, noise subtraction, clap grading), `recordClaps` (getUserMedia + MediaRecorder + live AnalyserNode level), `synthesizeImpulse` (seeded per-band decaying noise, loudness matched), `loadDryVoice` (dry source adapter).
- `lib/data.ts`: types, 10 seeded rooms with plausible band RT60s and clap quality, 6 furnishings with band coefficients and cost, `averageCut`, `fixFor`, and the localStorage adapter `loadLocalRooms` / `saveLocalRoom`.
- `components/home-bento.tsx`: the six-cell bento (claim + live product, image, CTA, quality stamp, speech window, duvet vs foam finding).
- `components/room-explorer.tsx`: fieldbook list, URL-synced filters, the shared-layout Quick look.
- `components/room-bench.tsx`: detail body, `ListenAB`, `DecayCurve` (canvas).
- `components/clap-capture.tsx`: listening states (idle, recording with level meter, analyzing, result with per-clap report, error).
- `components/band-bars.tsx`: animated per-band bars with the speech range strip.
- `components/ui/`: button, card, badge, input, select, restyled for the fieldbook direction (2px corners, 1px ink rules, stamps, no shadows).
- `public/logo.svg`, `app/icon.svg`, `public/illustrations/scene-{1,2,3}.svg`, `app/opengraph-image.tsx`: brand pack.

### Real vs mocked

Real: clap capture, onset detection, octave filter bank, Schroeder integration, T20 fit, clap grading, Sabine prediction, best-fix search, impulse synthesis, convolution playback. All in the browser, nothing mocked.

Mocked or stand-in:
- `loadDryVoice` in `lib/acoustics.ts`: uses a formant-synth phrase until a CC0 anechoic speech file is placed at `public/audio/dry-speech.wav` (then it is picked up automatically; the UI names the source).
- `loadLocalRooms` / `saveLocalRoom` in `lib/data.ts`: localStorage only, so measured rooms live on one device.
- Seed rooms in `lib/data.ts` are plausible illustrative data, not measurements. Replace or add real measurements from the team's own rooms before submitting and say so in the README.

### Interaction kit (K1 motion)

- Shipped: **signature 1, shared-layout transition.** On `/`, "Quick look" on a fieldbook row grows that row into the expanded specimen card via `layoutId={`room-${slug}`}` (`components/room-explorer.tsx`), driven by the seeded room, with its band bars and cheapest fix plan.
- To build: **signature 2**, a draggable or pointer-tracked artifact bound to a real value (suggested: drag a handle on the room's height or the curtain width in the bento, `useMotionValue` + `useTransform`, and the predicted RT60 on screen updates as you drag).
- To build: **signature 3**, `AnimatePresence` staging on `/new` and in `ClapCapture`: idle, listening, analyzing, result and error swap with exit animations; the per-clap report rows stagger in through `variants`.

### One-mark proof (header in `app/layout.tsx`)

```tsx
<Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold">
  <BrandMark />
  Decaya
</Link>
```

## 3. Mission (in order)

Roughly 15 hours of work remain. Cut scope before you cut the wow moment.

1. **Deploy first (0.5 h).** Push to Vercel. The microphone needs HTTPS, so the first real test is on the deployed URL from a phone. Done = `/new` asks for the mic on iOS Safari and Android Chrome.
2. **Harden clap measurement (3.5 h).** Test in a dorm room and a bathroom; the bathroom must read longer. Tune the onset thresholds in `analyzeRecording` (25 dB over the noise percentile, 6 dB rise, 0.9 s gap). If MediaRecorder compression smears tails, switch `recordClaps` to an AudioWorklet that copies raw PCM. Done = three claps produce a big mid-band number and five band values within 2 s of the recording ending.
3. **Decay curve polish (1.5 h).** The canvas already draws per-band lines, the measured 1 kHz Schroeder curve after a live measurement, and the speech wedge. Done = a live measurement visibly falls through the wedge or past it, and the 1 kHz band reads as "too live" in the bars.
4. **Quality control evidence (1.5 h).** The report exists (valid count, noise floor, per-clap reasons, processing warning). Keep an iteration log while testing: what broke, what you changed. Done = the README test table is filled with real numbers, including a cross-check of 3 rooms against an iOS clap app.
5. **Furnishing simulator (2.5 h).** Working now. Add signature 2 (drag to resize a curtain or the room) and double-check coefficient sources on `/about`. Done = in the demo room, curtain + duvet drop the bars into the green strip live.
6. **Listen before you buy, the wow moment (3 h, schedule it for day 2 morning, rehearse it twice).** Working with the synth voice. Find a CC0 anechoic speech clip, put it at `public/audio/dry-speech.wav`, credit it. Tune `synthesizeImpulse` (the 2.2 reverb ratio and band Q) until "now" sounds like the room and "after" sounds clearly drier at the same loudness. Done = a judge hears the difference on laptop speakers.
7. **Signature 3 (1 h).** AnimatePresence staging in `ClapCapture` and staggered per-clap rows.
8. **Buffer and device testing (1 h).** Mobile Safari, Chrome, a friend's room.
9. **Submission text and video (2 h).** README doubles as the submission: fill the test table, add team roles and what was built during the event. Record the 90 s demo:
   - 0 to 15 s: "This is what my dorm podcast sounds like." Open Decaya, phone on the desk, three claps, stamp reads "3 of 3 claps valid".
   - 15 to 45 s: the mid-band number appears (around 0.9 s), the curve falls past the green wedge, 1 kHz and 2 kHz bars sit about twice over the speech range. One line: "It is not the mic, it is the room."
   - 45 to 75 s: room size 3 x 4 x 2.6 m, add thick curtain and duvet on the wall, bars drop into the strip; show that the foam pack does less.
   - 75 to 90 s: tap "Your room now" then "With thick curtain + duvet on the wall". Close: "Listen before you buy. Decaya, in your browser, no install."

## 4. Constraints

- Stack: Next.js 15 App Router, TypeScript strict, Tailwind v4 (no tailwind.config, no `@tailwind` directives), shadcn primitives in `components/ui/`. Deploys to Vercel: no custom server, no runtime file writes.
- `IDENTITY.md` is law for every color, font, route, layout and animation decision. Colors only through the tokens in `app/globals.css`; no raw hex in components. Corners stay 2px. Fraunces on every h1 and h2, Source Sans 3 for body. Motion entrance is the `decaya-drop` keyframe; keep the reduced-motion block working. Append to its Amendments section if you must record a decision; never edit above it.
- Kit rules: every `motion/react` import lives in a `"use client"` file; content stays readable in server HTML (`initial={false}`, never server-render at opacity 0); honor reduced motion.
- No teal, mint, cyan or navy anywhere. No terminal cards, no mono stat strips, no badges above an h1.
- Copy: plain English, human tone, no em dashes, no hype words (seamless, leverage, unlock, robust and friends). Label predictions as predictions.
- Honesty: never present seed rooms as measurements you took; never claim a model, API or test result that the code and the log do not back up.
- Scope: if something threatens the deadline, cut it. Measurement, simulator and A/B playback are the product; everything else is optional.
- Run `npm run build` after every change and keep it green.

## 5. Definition of done

- Deployed on Vercel at https://decaya.vercel.app with the microphone working over HTTPS on a phone.
- README demo link live, test table filled with real numbers, team roles and event note added, AI use and CC0 audio credited.
- The 90-second demo runs end to end: clap, number and curve, add curtain + duvet, hear before and after.
- The wow moment rehearsed at least twice on the device used for the recording.
- Kit signatures 2 and 3 shipped, `npm run build` green.
