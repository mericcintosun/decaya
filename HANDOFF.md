# HANDOFF: Decaya

## Phase 1 log: walking skeleton and demo path (2026-11-24)

### Goal
Every step of the 90 s demo has a route that renders from seed data through one adapter seam, and the path is clickable end to end: home bento, a room's bench, add curtain and duvet, "Your room now" then "With thick curtain + duvet on the wall". The measurement code was not rewritten.

### Status
All four slices written. Not built: the agent cannot run commands, so `npm install`, `npm run build` and `npm run seed` are unverified until the runner runs them.

- Slice 1 done: `DEMO.md` (6 steps, each names an existing file), `CLAUDE.md` (commands, pitfalls, Never list, Vercel guardrails, compaction line as the last line), `.env.example` (`ADAPTER_MODE=fake`, plus a commented `NEXT_PUBLIC_BRAND_FILES=` entry).
- Slice 2 done: `lib/types.ts` (`Room`, `RoomType`, `RoomUse`, `ApiResponse<T>`, re-exports `BandValues`, `RoomDims`, `Furnishing`, `Verdict`), `lib/data/seed.ts` (`SEED_ROOMS` 10, `SEED_FURNISHINGS` 6, fixed slugs and dates, no `Date.now`/`Math.random`), `lib/data.ts` is now a shim plus helpers, `lib/adapter.ts` (`fakeAdapter`, `realAdapter`, `getAdapter`), `scripts/seed.ts`, `package.json` seed script and `tsx ^4`.
- Slice 3 done: `app/api/rooms/route.ts`, `app/api/rooms/[slug]/route.ts` (404 `not_found`), `app/api/furnishings/route.ts`; `/`, `/rooms/[slug]` and `/about` read through `getAdapter()`; `HomeBento` and `RoomExplorer` take rooms and furnishings as props; `loading.tsx` in `app/`, `app/rooms/[slug]/`, `app/new/`; explorer empty state is a specimen tag with a "No specimen" stamp; bench shows a "No band data" state when a room lacks five valid band values.
- Slice 4 done: `components/nav-links.tsx` (client, `usePathname`, `aria-current="page"`, DEEP fill plus underline), layout metadata `title: { default: "Decaya", template: "%s | Decaya" }`, per-page titles (Rooms, room name, Measure a room, Method), new `app/error.tsx` (brand name, `reset()`, link home, no message printed) and `app/not-found.tsx` (brand name, link home), hexes moved into a `@theme static` block with spacing, type scale and radii, `overflow-x-auto` wrappers on the decay canvas, the band bars and the `/about` table, README paragraph and stack majors.

### Decisions
- `lib/data.ts` stays as a shim (types re-exported, `SEED_ROOMS`/`SEED_FURNISHINGS` re-exported, helpers kept). The old `rooms`, `furnishings` and `getRoom` exports were removed after every importer moved to the adapter or to props.
- `fixFor` and `averageCut` take an optional furnishing catalog (default: the seed catalog); components pass the adapter's furnishings.
- `getAdapter()` returns `realAdapter` only for `ADAPTER_MODE=real`; anything else is fake. `realAdapter` delegates to fake, because real rooms are measured and stored in the browser.
- Seed rooms are labelled as illustrative in the bento ("An example from the fieldbook ... with illustrative values") and on the bench header ("illustrative example values, dated ..."). The home bento result line now says "predicted".
- The fieldbook list in `components/room-explorer.tsx` is NOT wrapped in `overflow-x-auto`: that wrapper would clip the `layoutId` return animation of signature 1. Rows already collapse to one column below `sm`. A comment at the `<ol>` explains this.
- Tokens: the eleven IDENTITY hexes now live only in `@theme static` in `app/globals.css` (`--color-ground` and friends). `:root` keeps the short names (`--ink`, `--line`, `--grass`, `--ok-tone`) as aliases because the canvas reads them with `getComputedStyle`. If the build rejects `@theme static`, drop the word `static` (the `:root` aliases reference the variables, which keeps them emitted).
- Live URL: the deploy step edits the README `> Live demo:` line only; Phase 2 records the URL in this file.

### Failed attempts
None.

### Files changed
DEMO.md, CLAUDE.md, .env.example, lib/types.ts, lib/data/seed.ts, lib/data.ts, lib/adapter.ts, scripts/seed.ts, package.json, app/api/rooms/route.ts, app/api/rooms/[slug]/route.ts, app/api/furnishings/route.ts, app/page.tsx, app/rooms/[slug]/page.tsx, app/about/page.tsx, app/loading.tsx, app/rooms/[slug]/loading.tsx, app/new/loading.tsx, components/home-bento.tsx, components/room-explorer.tsx, components/room-bench.tsx, components/band-bars.tsx, components/new-room-form.tsx, components/nav-links.tsx, app/layout.tsx, app/error.tsx, app/not-found.tsx, app/globals.css, README.md, HANDOFF.md.

### Commands run
None, the agent cannot run commands; the runner builds.

### Open questions
- `npm run build`, `npm run seed` (twice, byte-identical `fixtures/seed.json`) and the Vercel deploy are unverified (runner and human).
- `fixtures/seed.json` does not exist until `npm run seed` runs; commit it after the runner generates it.
- The fieldbook list has no `overflow-x-auto` wrapper (see Decisions, `components/room-explorer.tsx` at the `<ol>`). Spec item partly unmet on purpose to protect signature 1.
- `@theme static` support in the installed Tailwind 4.1 is assumed, not verified by a build.
- `motion` `^14.14.0` is the IDENTITY range; the runner's install decides whether it resolves.

### Next best step
Phase 2: real clap capture hardening behind the adapter seam (onset thresholds, AudioWorklet raw PCM if MediaRecorder smears tails), the CC0 speech clip at `public/audio/dry-speech.wav` (credited in README), and an `npm run proof` script. Record the live URL here.

## Phase 2 log: the measurement engine goes real (2026-11-24)

### Goal
Put the in-browser acoustic measurement and playback (the Web Audio pipeline) behind one engine seam, selected by `ADAPTER_MODE` through the adapter, so DEMO step 2 (three claps, "3 of 3 claps valid") and step 5 (`ListenAB`, "Your room now" then "With thick curtain + duvet on the wall") run on the real engine, while `ADAPTER_MODE=fake` keeps a microphone-free demo.

### Status
All six slices written. Nothing was built or run: the agent cannot run commands, so `npm install` (zod), `npm run build`, `npm test` and `npm run proof` are unverified until the runner and the human run them.

- **Mechanism that went real:** the measurement engine. `realEngine` in `lib/engine.ts` (line 47) records the microphone with `recordClaps` (raw PCM through `public/worklets/pcm-capture.js`, MediaRecorder fallback) and analyzes it with `analyzeRecording` in the browser. `getEngine(mode)` (`lib/engine.ts:107`) is the only switch. `fakeEngine` returns `fixtures/measurement.json`, validated by `measurementSchema`, after 900 ms, and always uses the formant synth voice.
- **Still on fixtures:** `realAdapter.listRooms`, `realAdapter.getRoom` and `realAdapter.listFurnishings` in `lib/adapter.ts` delegate to the seeded fieldbook, because measured rooms live in the visitor's browser (localStorage) and there is no server store.
- `.farm-live.json` has an empty `requiredEnv` because the real path is in-browser computation that needs no secret, no API key and no server-side service.
- Slice 1: `lib/config.ts` (every tunable, no env, header comment), `lib/errors.ts` (`ErrorCode`, `CoreError`, `coreError`, `HINTS`, `isCoreError`, and `CoreFailure` thrown inside `lib/acoustics.ts`), `lib/schemas.ts` (`slugSchema`, `bandValuesSchema`, `roomDimsSchema`, `clapReportSchema`, `measurementSchema`, `storedRoomSchema`, plus compile-time `asMeasurement`/`asRoom` checks), zod in `package.json`, `ApiResponse<T>` failure variant is now `{ ok: false, error, hint }` (`lib/types.ts`), the slug route parses first (`app/api/rooms/[slug]/route.ts:8`) and returns 400 `invalid_input` or 404 `not_found`.
- Slice 2: engine seam as above. `app/new/page.tsx` and `app/rooms/[slug]/page.tsx` pass `getAdapter().mode` as `mode` to `NewRoomForm`, `ClapCapture` and `RoomBench` (then `ListenAB`). The source line shows after a result: `realEngine.sourceNote` / `fakeEngine.sourceNote`. A room saved in fake mode gets "Sample data" notes, not "Measured in this browser".
- Slice 3: AudioWorklet capture (`lib/acoustics.ts:390`), with a startup check (no audio after 600 ms means fallback), `processingWarning: true` forced on the MediaRecorder path (`lib/acoustics.ts:510`), tracks stopped and context closed in one `finally` on every exit path, abort on unmount from `ClapCapture`. `analyzeRecording` clamps the noise window at 0 (`lib/acoustics.ts:292`), marks claps with under 0.3 s of tail invalid with "Not enough tail after this clap." (`lib/acoustics.ts:315`), and takes the 1 kHz curve from the first valid clap. `ClapCapture` switches on `err.error` for the title and shows `err.hint` plus a "Try again" button. The quality report names the capture path.
- Slice 4: `loadDryVoice` (`lib/acoustics.ts:655`) uses `AbortController` with `FETCH_TIMEOUT_MS`, a `for` loop of exactly `1 + FETCH_RETRIES` attempts, no retry after a 404 or a decode failure, and falls through to the synth without throwing. `ListenAB` builds both impulse responses together (same function, same `IMPULSE_SEED`, same loudness match) before either plays, caches them per band pair, and fades the previous side (and its reverb tail) out in 30 ms before the other starts. The voice label and the relative-preview note sit under the buttons (`components/room-bench.tsx:382` and `:385`).
- Slice 5: `tests/core.test.ts` (5 tests), `scripts/proof-core.ts`, `scripts/proof.mjs`, `test` and `proof` scripts, four PROOF marker pairs in README under "How it was tested", `.farm-live.json`.
- Slice 6: README (real vs fixture section, AudioWorklet, zod, test commands, honest dry voice credit, AI use), one sentence on `/about`, DEMO data path paragraph, this log.

### Decisions
- Asymmetry found and fixed in `ListenAB`: each tap used to build only its own impulse after the click (a build gap on every switch), and stopping a source did not silence the convolver tail, so A and B could overlap. Now both are built first and the old side fades out.
- `AdapterMode` moved to `lib/types.ts` (re-exported from `lib/adapter.ts`) so client files import a type, never the adapter.
- `CoreFailure` (an `Error` subclass with a `code`) is thrown inside `lib/acoustics.ts`; `toCoreError` in `lib/engine.ts` turns it, or a `DOMException` (`NotAllowedError`/`SecurityError` mean `mic_denied`, any other means `mic_unavailable`), into a plain `CoreError`. UI code never reads message text.
- `SPEECH_TARGET` stays in `lib/acoustics.ts`; `lib/config.ts` points at it in a comment instead of importing it (avoids a circular import).
- `Measurement` gained an optional `capturePath` ("worklet", "mediarecorder", "fixture") so the builder can see on a phone which path ran.
- `fixtures/measurement.json` uses a 0.02 s curve step (44 points) so it stays readable; mid band 0.905 s.
- The README room test table now says "Not measured yet" per row instead of "(to fill)".

### Failed attempts
None.

### Files changed
lib/config.ts (new), lib/errors.ts (new), lib/schemas.ts (new), lib/engine.ts (new), fixtures/measurement.json (new), public/worklets/pcm-capture.js (new), tests/core.test.ts (new), scripts/proof.mjs (new), scripts/proof-core.ts (new), .farm-live.json (new), lib/acoustics.ts, lib/adapter.ts, lib/types.ts, app/api/rooms/[slug]/route.ts, app/new/page.tsx, app/rooms/[slug]/page.tsx, app/about/page.tsx, components/clap-capture.tsx, components/new-room-form.tsx, components/room-bench.tsx, package.json, .env.example, README.md, DEMO.md, HANDOFF.md, .farm-commits.json (runner only, not committed).

### Commands run
None. The agent cannot run commands; the runner installs, builds and commits.

### Acceptance gate, checked by reading files
- Met: one `MeasureEngine` interface with `fakeEngine` and `realEngine`, `getEngine` the only switch; `lib/adapter.ts:46` is the only `ADAPTER_MODE` reader, default fake.
- Met: no file in `app/` or `components/` imports `realAdapter` or `realEngine` (grep); `mode` arrives as a prop from server pages.
- Met: `.farm-live.json` has both arrays; the empty `requiredEnv` is explained above.
- Met: `lib/config.ts` holds the listed constants and reads no env; a grep of `lib/acoustics.ts` for the old inline thresholds (0.985, 25, 6, 90 frames, 0.2, 1.414, 2.2, 0.8, the clip URL) finds nothing.
- Met: `ErrorCode` and `CoreError` exported; `ClapCapture` switches on `err.error`; the slug route parses first and returns `{ ok: false, error, hint }`.
- Met: schemas exported from `lib/schemas.ts`; zod declared; no `NEXT_PUBLIC_` secret.
- Met: `loadDryVoice` loop is bounded by `1 + FETCH_RETRIES`.
- Met: core-path logs start with `LOG_PREFIX` and print counts, durations and codes only.
- Met: `test` and `proof` scripts, the three files, four BEGIN/END pairs; the failure path writes "Not run in this build: ..." and `process.exit(0)`.
- Met: zero hits for `<PASTE`, `<fill in`, `Paste the`, `placeholder until`, `TBD` in README.md, DEMO.md, HANDOFF.md (no `docs/` folder exists).
- Met: the UI says "Live measurement" or "Sample data" from `engine.sourceNote`, driven by `mode`.
- Met by reading, unverified by running: the fake path renders `/new` and the bench, seed stays at 10 rooms, and `ListenAB` has no real-only branch besides `engine.dryVoice`.
- Met: imports in touched files resolve to repo files, `zod`, `lucide-react` (`RotateCcw` is new) or Node built-ins.
- Met: the sameness tripwire grep on `app/`, `components/`, `lib/` finds zero hits; no new chrome, stat strips, steppers or badges; the header was not touched.

### Open questions
- Unverified until the runner runs it: `npm install` resolving `zod ^3.25.76`, `npm run build` type-checking the new `tests/` and `scripts/` files (they are inside the tsconfig `include`), `npm test`, `npm run proof`.
- Unverified on devices: whether Safari iOS and Chrome Android run the AudioWorklet path or fall back. The quality report prints "Capture: raw PCM (AudioWorklet)" or "compressed recording (MediaRecorder fallback)".
- If the build objects to the JSON import in `lib/engine.ts`, `tests/core.test.ts` or `scripts/proof-core.ts`, `resolveJsonModule` is already on in `tsconfig.json`; check the error before changing the import.
- Live URL still to record here after the runner sets `ADAPTER_MODE=real` on Vercel production.

### Manual checklist for the builder
- (a) Drop a CC0 anechoic speech clip at `public/audio/dry-speech.wav` and add its credit line to README "Credits" (replace the formant synth line).
- (b) Test `/new` on iOS Safari and Android Chrome over the HTTPS URL, and note from the quality report whether the AudioWorklet path or the fallback ran.
- (c) Measure a dorm room and a bathroom, cross-check 3 rooms against an iOS clap app, then add the real numbers to the README room test table by hand.
- (d) Fill in team roles and the eligibility (students only) confirmation in README.
- (e) Rehearse the wow step (DEMO step 5) twice on the recording device.

### Next best step
Phase 3: run the manual checklist items (b) and (c) on the deployed URL, tune the onset thresholds and the impulse constants in `lib/config.ts` from those results, and fill the README test table with real numbers.

---

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
- `lib/types.ts`: shared types and `ApiResponse<T>`. `lib/data/seed.ts`: 10 seeded rooms and 6 furnishings. `lib/adapter.ts`: `getAdapter()` seam. `lib/data.ts`: shim plus `averageCut`, `fixFor`, `ROOM_TYPES`, `ROOM_USES` and the localStorage helpers `loadLocalRooms` / `saveLocalRoom`.
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
- `realAdapter` in `lib/adapter.ts` delegates to the fake adapter.
- Seed rooms in `lib/data/seed.ts` are plausible illustrative data, not measurements. Replace or add real measurements from the team's own rooms before submitting and say so in the README.

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
