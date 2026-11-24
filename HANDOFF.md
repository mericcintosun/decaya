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

## Phase 3 log: demo path end to end, persistence and state guards (2026-11-24)

### Goal
Make DEMO.md steps 2, 3 and 6 safe to repeat three times in a row: clap (or fall back to the sample), save once, land on `/rooms/[slug]` with no flash of "not found", see the room at the top of `/`. Every route on the path has a loading, error and empty branch; a double click cannot create two rooms; `demo:reset` plus "Clear rooms measured here" returns to the same start state. `ListenAB`, `synthesizeImpulse`, `analyzeRecording` thresholds and `public/worklets/pcm-capture.js` were not touched.

### Status
All five slices written. Nothing was built or run: the agent cannot run commands, so `npm run build`, `npm test`, `npm run proof` and `npm run demo:reset` are unverified until the runner runs them. No cut from the cut protocol was needed.

### Decisions

**Persistence.** The demo mutates exactly one thing: the rooms a visitor measures. They are per visitor, private and small; no step needs another device to see them; the builder cannot provide a KV or database credential.

| Row | Verdict |
| --- | --- |
| Seed constants, in memory per request (`lib/data/seed.ts`) | Used for the illustrative fieldbook. Stays. |
| One JSON blob in a KV store | Rejected: needs a secret the builder cannot supply, adds a network hop to step 2, no step needs cross-device rooms. |
| Postgres | Rejected: nothing in DEMO.md filters or joins relational data. |
| On-chain state | Not applicable. |

Chosen: browser localStorage (key `decaya.rooms.v1`) behind one module, `lib/store.ts` (`readRooms` line 69, `saveRoom` line 93, `clearRooms` line 118, `subscribeRooms` line 128). It is the only file that touches localStorage (grep over `app/`, `components/`, `lib/` finds only comments elsewhere). It works on Vercel because it runs in the visitor's browser and writes no server file. The old `loadLocalRooms` / `saveLocalRoom` and the stale Vercel KV TODO were removed from `lib/data.ts`; every importer moved to the store.

- `saveRoom` validates with `storedRoomSchema` (returns `invalid_input`), then upserts by slug: an existing slug is replaced in place, a new slug goes first (so `/` lists it first). Quota or blocked storage returns `{ ok: false, error: "not_configured", hint: "This browser would not keep the room..." }`. No `ErrorCode` or `HINTS` entry was added.
- `readRooms` caches its result per raw string (the same object comes back while the stored string is unchanged), returns a constant on blocked storage, and never throws. A corrupt stored value is overwritten by the next save.
- `useLocalRooms()` (`components/use-local-rooms.ts`) is `useSyncExternalStore` with a module-level server snapshot `{ rooms: [], ready: false }`. `RoomExplorer` and `RoomBench` read browser rooms only through it; no effect reads rooms. DEMO.md step 6 reads rooms through `useLocalRooms()`.
- The saved room's note comes from `measurementNote(m)` in `lib/data.ts` (line 52), which reads `m.capturePath === "fixture"` (the value in `fixtures/measurement.json` line 41). `components/new-room-form.tsx` and the bench re-measure both use it, so a sample used as a fallback in real mode is saved as "Sample data".
- The bench re-measure no longer saves silently: a local room gets a "Save the new numbers" button (`components/room-bench.tsx:275`, `disabled={!pending || saving}`). An example room says the new measurement updates the page only.
- `realAdapter` now reads a validated real source (seed rooms checked against `storedRoomSchema`, slug checked against `slugSchema`) through `withFallback` (`lib/adapter.ts:79`, `:81`, `:83`). There is still no server store; the real server data is the fieldbook.
- `components/scene-slot.tsx` now renders through `next/image`, with `unoptimized` for SVG sources (the optimizer does not resize vectors) and `priority` for scene 1.
- `scripts/seed.ts` logic moved to `scripts/seed-data.ts` (`buildSeedJson`), output unchanged byte for byte (same payload, same `sortKeys`, same trailing newline).
- Wallet state machine: not applicable. `package.json` has no web3 dependency (no wagmi, no Stellar SDK, no Anchor), and the repo has no `contracts/`.

**Per-step map (real path and fallback)**

| Step | Real path | Fallback |
| --- | --- | --- |
| 1. `/` | `getAdapter().listRooms()` in `app/page.tsx` | `fakeAdapter` through `withFallback` in `lib/adapter.ts` |
| 2. `/new` | `realEngine.capture` in `lib/engine.ts` | `fakeEngine`, reachable by the user: "Use the sample measurement" in `components/clap-capture.tsx:143` on `mic_denied`, `mic_unavailable` or `no_clap`, stamped "Sample data" |
| 3. `/rooms/[slug]` | `lib/acoustics.ts` pure computation; local rooms via `useLocalRooms()` | seed room via `adapter.getRoom` (`withFallback`); `BenchSkeleton` until the store is read |
| 4. simulator | `predictRt60` in `lib/acoustics.ts`, no network | not needed (pure function) |
| 5. `ListenAB` | `engine.dryVoice` | `synthesizeDryVoice` inside `loadDryVoice` (Phase 2, unchanged) |
| 6. `/` | `useLocalRooms()` plus `adapter.listRooms()` | seeded fieldbook plus the "could not be read" stamp when storage fails |

**State triad map**

| Route | Loading | Error | Empty |
| --- | --- | --- | --- |
| `/` | `app/loading.tsx` renders `SpecimenSkeleton` | `app/error.tsx` renders `ErrorState` with `reset` | `components/room-explorer.tsx` renders `EmptyState` ("No specimen", CTA "Add a room" to `/new`); `failed` stamp with "Clear saved rooms" |
| `/new` | `app/new/loading.tsx` renders `FormSkeleton` | `app/new/error.tsx` renders `ErrorState` with `reset`; `ClapCapture` error branch keeps "Try again" | `components/new-room-form.tsx` renders `EmptyState` ("No reading yet", "Clap three times to fill this in.") until a measurement exists |
| `/rooms/[slug]` | `app/rooms/[slug]/loading.tsx` renders `BenchSkeleton`; `RoomBench` renders `BenchSkeleton` while `useLocalRooms().ready` is false for a non-seed slug | `app/rooms/[slug]/error.tsx` renders `ErrorState` with `reset` | `RoomBench` renders `EmptyState` with `HINTS.not_found` and CTA "Measure a room" |

All five components live in `components/states.tsx` (`SpecimenSkeleton`, `BenchSkeleton`, `FormSkeleton`, `ErrorState`, `EmptyState`). Skeletons are static ruled blocks; `ErrorState` enters with `decaya-drop-in` only.

**Write guards**
- Slug: `${slugify(name) || "room"}-${draftId}` (`components/new-room-form.tsx:58`). `draftId` is a `useRef` set once per measurement in `onResult` (`crypto.randomUUID`, counter fallback). A double click or retry builds the same slug.
- `saving` state: `disabled={!m || saving}` (`components/new-room-form.tsx:198`), label "Saving...", `setSaving(false)` on a failed result; on success it stays true while the router leaves.
- `storedRoomSchema.safeParse` runs before every `saveRoom` (`components/new-room-form.tsx:73`, `components/room-bench.tsx:144`), and `saveRoom` checks again (`lib/store.ts:94`). Failures show the `invalid_input` hint. Name, owner and city are trimmed and capped at 120, 80 and 80 (`FIELD_LIMITS` in `lib/data.ts`, plus `maxLength` on the inputs).
- No API route was added.

**Performance notes.** No step waits on the network for rooms: data enters each route from a server component (`getAdapter()`) plus the single `useLocalRooms()` hook, which reads localStorage synchronously. The only step over 5 s is the 7 s capture window step 2 is built around; analysis is expected within 2 s of it (Phase 2 logs the duration with `LOG_PREFIX`). Not timed on a device by this agent.

### Failed attempts
None.

### Files changed
lib/store.ts (new), components/use-local-rooms.ts (new), components/states.tsx (new), app/rooms/[slug]/error.tsx (new), app/new/error.tsx (new), scripts/seed-data.ts (new), scripts/demo-reset.ts (new), tests/store.test.ts (new), tests/memory-storage.ts (new), lib/data.ts, lib/adapter.ts, components/room-explorer.tsx, components/room-bench.tsx, components/new-room-form.tsx, components/clap-capture.tsx, components/scene-slot.tsx, app/loading.tsx, app/rooms/[slug]/loading.tsx, app/new/loading.tsx, app/error.tsx, scripts/seed.ts, scripts/proof-core.ts, scripts/proof.mjs, package.json, README.md, .env.example, DEMO.md, HANDOFF.md, .farm-commits.json (runner only, not committed).

### Commands run
None. The agent cannot run commands; the runner installs, builds, tests and commits.

### Acceptance gate, checked by reading files
- Met: every step has a real path and a fallback (table above); `withFallback` wraps all three real methods (`lib/adapter.ts:79-83`).
- Met: `lib/store.ts` is the only file that touches localStorage; KV, Postgres and on-chain rows recorded as rejected.
- Met: no `fs` import in `app/`, `components/`, `lib/` (grep); `fs` writes are in `scripts/seed.ts`, `scripts/demo-reset.ts` and `scripts/proof.mjs` only (`next.config.ts` reads `public/brand` at build time, as before).
- Met: no secret; `.env.example` line 4 says the store needs no secret and no `NEXT_PUBLIC_` key; `.farm-live.json` unchanged.
- Met by reading: `demo:reset` in `package.json` compares two serializations (`scripts/demo-reset.ts`) and checks 10 rooms and 6 furnishings.
- Met: the triad exists on `/`, `/new`, `/rooms/[slug]` (table above); every `ErrorState` has `onRetry` bound to `reset`.
- Met: `saving` in the `disabled` expression; `saveRoom` upserts by slug; slug from `draftId`; no `Date.now` in `components/new-room-form.tsx`.
- Met: no effect in `room-explorer.tsx` or `room-bench.tsx` reads rooms (the remaining effects are Escape key, URL sync, audio cleanup, canvas resize and draw).
- Met: `components/scene-slot.tsx:1` imports `next/image`.
- Met: README "Reset the demo" holds the migration note.
- Met: no new dependency; new imports resolve to repo files, `react`, `next/image`, `next/link`, `lucide-react`, `zod` or Node built-ins.
- Met: `tests/store.test.ts` has 6 tests; `tests/core.test.ts` is unchanged.
- Met: tripwire greps on `app/`, `components/`, `lib/` find hexes only in `app/globals.css`, `app/icon.svg` and `app/opengraph-image.tsx` (Never list, unchanged); no banned keyframe or prop; no em dash, en dash or spaced double hyphen in the repo; `app/layout.tsx` not touched (one `BrandMark`).

### Open questions
- Unverified until the runner runs it: `npm run build` (including type checks of `tests/` and `scripts/`), `npm test` (11 tests expected), `npm run proof` (the README `store` block holds an honest "Not run" line until then), `npm run demo:reset`.
- `fixtures/seed.json` is still not in the repo (Glob of `fixtures/` finds only `measurement.json`); `npm run seed` or `npm run demo:reset` creates it, then commit it.
- If Node's own experimental `globalThis.localStorage` interferes with the test stub, `installStorage` in `tests/memory-storage.ts` uses `Object.defineProperty` to replace it; check the first test run.
- If `useSyncExternalStore` causes a hydration or loop error, the cut protocol fallback is a single `useEffect` inside `useLocalRooms()`; not needed by reading, unverified by running.
- `next/image` with `unoptimized` SVG sources: confirm on the deploy that the `/rooms/[slug]` scene and the bento scene render.
- Human checks still open: three DEMO.md cycles on the live URL in a private window; block the mic once and save via "Use the sample measurement" (notes must say "Sample data"); double-click "Save to the fieldbook" and confirm one room.
- In real mode, opening a local room logs `[core] adapter getRoom: not_found, using fallback` on the server once per visit (code only, no payload). Harmless, but noisy in logs.

### Next best step
Phase 4: landing and submission polish, and the README test table with real numbers from the manual checklist (items b and c above).

## Phase 4 log: second wow, responsive pass, landing, security sweep (2026-11-24)

### Goal
Ship KIT signature 2 (drag the room width on the bench, the predicted bars and the predicted RT60 move live) as DEMO.md step 7; make every demo route work at 360, 768 and 1280 px (nav disclosure, touch targets, long strings, overflow); finish root metadata and empty-state copy; add a landing section on `/`; write DELIVERY.md and SECURITY.md after a security sweep.

### Status
All six slices written; nothing was cut. Nothing was built or run: the agent cannot run commands, so `npm run build`, `npm test` and `npm run proof` are unverified until the runner runs them. Slice 6 (web sweep) found no defect, so it changed no file and has no entry in `.farm-commits.json`. Each file appears in one commit only: the empty-state copy in `components/room-bench.tsx` rides with commit 2, the one in `components/room-explorer.tsx` with commit 3, and the README "Source:" link with commit 1.

### Decisions
- **Second wow selection.** All five idea features already ship, so the second wow is KIT signature 2 from the mission. It needs no new seat or provider, it is the most visible on screen per hour, and it costs the fewest hours. `components/room-size-handle.tsx` (new, `"use client"`) is a `motion` handle (`drag="x"`, `useMotionValue`, `useTransform`, `dragConstraints`, `whileHover`, `whileDrag`) that reports a width between 2 and 6 m. `Bench` passes it `dims.width` and writes back through the same `setDims` the number inputs use (`components/room-bench.tsx:238`), so the existing `predictRt60` memo (`components/room-bench.tsx:115`) reruns. No acoustics were written.
- Physics check by hand (not run): with thick curtain and duvet on the sample measurement in a 4 x 3 x 2.6 m room, widening from 3 m to 5 m moves the predicted mid band from about 0.47 s to about 0.59 s, because the same item area is a smaller share of a bigger room. With nothing added, the prediction equals the measurement at any size; the card says so and asks for an item first.
- Below `lg` the band card sits above the simulator card, so a copy of `BandBars` (aria-hidden, `lg:hidden`) sits under the handle; on a phone the bars move in view while you drag.
- The handle renders only after the browser measures its track (`travel > 0`), so the server HTML never places it at a wrong spot; the width boxes and the "Predicted, from your room size" line are always in the server HTML. Keyboard: role `slider`, arrows 0.1 m, PageUp/PageDown 0.5 m, Home/End. Reduced motion drops the hover and drag scale only.
- **Nav pattern.** `components/nav-links.tsx`: inline `nav` with `hidden md:flex` (line 47); below `md` a "Menu" button with `md:hidden`, `aria-expanded`, `aria-controls`, `min-h-11` (lines 65 to 74) opens a full-width panel (`basis-full`, line 82) with the same three links, `aria-current="page"` and the DEEP fill plus underline. It closes on route change, on link click and on Escape. `AnimatePresence initial={false}` under `MotionConfig reducedMotion="user"`. The header still has one `BrandMark`, inside the brand link (`app/layout.tsx:33`).
- **Touch targets.** The Button `default` size moved from `h-9` to `h-11` (`components/ui/button.tsx:23`), and `Input`/`Select` from `h-10` to `h-11`. Every demo-path `size="sm"` button became default size or carries `min-h-11`. Long-label buttons (A/B, clap, bento toggles) got `h-auto min-h-11 whitespace-normal` so they wrap instead of overflowing at 360 px.
- **Fieldbook `<ol>` exception.** Still not wrapped in `overflow-x-auto`, which would clip the signature 1 `layoutId` return animation (comment at `components/room-explorer.tsx:173`). Rows and the filter bar now collapse to one column below `md` instead of `sm` (`:121`, `:184`). The Quick look overlay scrolls (`overflow-y-auto`, `:229`) and the card uses `my-auto` (`:238`) so a tall card starts at the top on a phone.
- **No-bounty ledger.** `requiredTech` is empty and there are no `sponsor-bounty` rows (expectedValueUsd null), so the bounty integrations front is empty and nothing was dropped. DELIVERY.md has the five placement sections; README states there are no sponsor bounties and has no bounty table row.
- **Landing.** Server-rendered `Landing` in `app/page.tsx:36`, below the bento (L4 bans a lead paragraph above the grid), no animation, links to `/new` and `/about`.
- **Metadata.** `metadataBase` is `https://decaya.vercel.app`; `app/opengraph-image.tsx` and `app/icon.svg` were not touched (CLAUDE.md Never list).

### Responsive audit (before the fixes)
- `/about` (smallest): coefficient table already in `overflow-x-auto` with `min-w-[44rem]`; "Try it on your room" button was `h-9`.
- `/new`: inputs and selects `h-10`; error and empty states fine; "Try again" and "Use the sample measurement" were `size="sm"` (`h-8`); the clap button had `whitespace-nowrap`.
- `/rooms/[slug]`: canvas and bars already wrapped; A/B buttons had `whitespace-nowrap` with long labels such as "With Thick curtain and Duvet on the wall (0.47 s)", an overflow at 360 px; Stop was `sm`; save and no-band buttons `h-9`; room name, owner line and notes had no wrapping rule; "All rooms in the fieldbook" link was `sm`.
- `/`: bento toggles and "Listen to the difference" were `sm`; "Quick look", "Clear rooms measured here", "Clear saved rooms" were `sm`; filter bar and rows went multi-column at `sm` (640 px), tight with `12rem + 12rem` columns; room names had no `title`; the overlay could not scroll a tall card.
- Nav: three `sm` links wrapped under the brand on a phone; no disclosure.
- Error and not-found pages render inside the layout shell (`app/layout.tsx:30` to `:39`: the header and `NavLinks` sit outside `{children}`), so the nav stays reachable.
All of the above are fixed in the files listed below.

### Failed attempts
None.

### Files changed
DELIVERY.md (new), SECURITY.md (new), components/room-size-handle.tsx (new), README.md, DEMO.md, HANDOFF.md, components/room-bench.tsx, components/nav-links.tsx, components/room-explorer.tsx, components/home-bento.tsx, components/clap-capture.tsx, components/new-room-form.tsx, components/ui/button.tsx, components/ui/input.tsx, components/ui/select.tsx, app/layout.tsx, app/page.tsx, app/rooms/[slug]/page.tsx, .farm-commits.json (runner only, not committed).

### Commands run
None, the agent cannot run commands.

### Acceptance ledger, checked by reading files
Part A
- Met: `DELIVERY.md` has `## 1st Place` to `## 5th Place`, each `entryMode: automatic`; `watch:` names DEMO.md steps 5 and 7, both present (`DEMO.md` lines 21 and 23).
- Met: README line "Bounties: No sponsor bounties in this hackathon; one submission enters 1st to 5th Place automatically." under Required tech, no bounty table; nothing dropped (recorded above).
- Met: DEMO.md step 7 names `/rooms/[slug]`, `app/rooms/[slug]/page.tsx`, `components/room-bench.tsx`, `components/room-size-handle.tsx` and the expected result; steps 1 to 7 are sequential. Marked optional in the 90 s script.
- Met: the handle imports `motion/react` in a `"use client"` file (`components/room-size-handle.tsx:1`, `:5`), drives `dims` through `setDims` (`components/room-bench.tsx:238`). Empty: `Bench` only renders when `hasBandData` is true, so the handle is hidden on the "No band data" card, whose copy now names claps and the sample measurement (`components/room-bench.tsx:83` to `:91`). Loading: `BenchSkeleton` (`components/room-bench.tsx:64`). Error: `app/rooms/[slug]/error.tsx`. New imports: `react`, `lucide-react` (`MoveHorizontal`, `Menu`, `X`), `motion/react`, repo files only.
- Met: `components/nav-links.tsx:47` (`hidden ... md:flex`), `:67` (`md:hidden`), links at `:12` to `:14`. Error and not-found render inside the shell (see audit).
- Met: canvas, bars, `/about` table and the new handle track (`components/room-size-handle.tsx:108`) sit in `overflow-x-auto`; the fieldbook `<ol>` exception is documented at `components/room-explorer.tsx:173`. The widest fixed width outside a scroll wrapper is `min-w-[18rem]` (288 px) in `components/band-bars.tsx:27` and the canvas, both inside `overflow-x-auto`.
- Met: demo-path buttons carry `h-11` (default and `lg` sizes) or `min-h-11` (grep `size="sm"` now finds only `app/rooms/[slug]/page.tsx:27`, which also carries `min-h-11`). Room names carry `break-words` plus `title` (`components/room-bench.tsx:84`, `:170`; `components/room-explorer.tsx:189` to `:190`, `:264`); the truncated owner line has a `title` (`:196`).
- Met: landing in `app/page.tsx:36` to `:63`, `href="/new"` at `:56`; home hrefs: `/new`, `/about`, `/rooms/${slug}` (bento and rows), all with route files.
- Met: `app/layout.tsx:18` `metadataBase`, `:19` template `%s | Decaya`, `:14` description (132 characters), `:22` `openGraph`, `:23` `twitter.card = "summary_large_image"`. `app/opengraph-image.tsx` and `app/icon.svg` exist.
- Met: empty states say what appears and how: explorer (`components/room-explorer.tsx:166` to `:167`), bench no band data (`components/room-bench.tsx:88` to `:90`), `/new` before the first clap (`components/new-room-form.tsx:190`).
- Met: no `console.` in `app/` or `components/` (grep); `lib/` logs unchanged with `LOG_PREFIX` and no payload. No `useSearchParams` anywhere (the explorer reads `searchParams` on the server and writes with `history.replaceState`). No `fs` or `writeFile` in `app/` or `lib/`. Env reads: `ADAPTER_MODE` (`lib/adapter.ts:88`) and `NEXT_PUBLIC_BRAND_FILES` (`lib/brand-files.ts:2`), both in `.env.example`. `.farm-live.json` not touched.

Part B
- Met: contract front skipped: Glob `contracts/**` finds nothing; Decaya runs in the browser and has no `contracts/` directory.
- Met: wallet front vacuous: grep `eth_requestAccounts|eth_sign|personal_sign|wallet_|ethereum|window\.ethereum|connect\(` over `app components lib` finds only Web Audio `connect(`/`disconnect(` calls (`components/room-bench.tsx`, `components/room-size-handle.tsx` ResizeObserver `disconnect`, `lib/acoustics.ts`). No wallet code.
- Met: `SECURITY.md` has the four sections plus data handling; its repo link `https://github.com/mericcintosun/decaya` matches the new README "Source:" line.
- Met: Part B added no route, dependency or feature module.

### Part B grep results
1. Keys: `sk-|PRIVATE_KEY|API_KEY|SECRET|[A-Fa-f0-9]{64}` over `app components lib public`: no matches. `NEXT_PUBLIC_BRAND_FILES` is a public list of image names (`next.config.ts:17`).
2. External links: `target="_blank"` over `app components lib`: no matches, so no `rel` fix needed.
3. Mixed content: `http://` over `app components lib`: one hit, `app/icon.svg:1`, the SVG `xmlns` namespace, never fetched. `metadataBase` is https.
4. Forms and third parties: `<form|action=|<script|next/script|gtag|googletagmanager|analytics|plausible|posthog|segment|sentry` (case-insensitive): no form, script or tracker hit (only unrelated words in `app/new/loading.tsx` and a seed comment). `fetch(|sendBeacon|XMLHttpRequest|WebSocket|EventSource`: one hit, the same-origin dry clip fetch in `lib/acoustics.ts:662`. Route handlers export `GET` only; no `cookies(` or `document.cookie`.
5. Guardrails: no `useSearchParams`; no `writeFile` or `fs.` in `app/`, `components/`, `lib/` (`next.config.ts` reads `public/brand` at build time, as before); every `process.env` key is in `.env.example`.
Result: clean, no finding, so no fix and no severity entry.

### Note for the builder's demo video
No wallet exists here, so no wallet warning is expected on screen.

### Open questions
- Unverified until the runner runs it: `npm run build` type-checking the new `RoomSizeHandle` (motion 14 `drag` props on `motion.div`, `useReducedMotion`, `MoveHorizontal` in `lucide-react ^0.474`), `npm test` (11 expected), `npm run proof`.
- Unverified on devices: the drag on iOS Safari and Android Chrome (`touch-none` on the handle stops page scroll while dragging), the menu at 360 px, and no horizontal page scroll at 360, 768 and 1280 px. The 0.47 s to 0.59 s figures in DEMO step 7 are hand-computed.
- With JavaScript off, a phone sees the "Menu" button but cannot open it (the inline links are `hidden` below `md`). The bento CTA, the landing links and the fieldbook rows still reach every route.
- The new Button default height (`h-11`) makes buttons on `/about`, not-found and error pages taller; Phase 5 may want to retune spacing around them.
- Still open from earlier phases (human): the CC0 clip at `public/audio/dry-speech.wav`, the iOS and Android mic test, the README test table with real numbers, team roles, `fixtures/seed.json` committed, the wow rehearsed twice, and the DELIVERY.md "Before submitting" list.

### Next best step
Phase 5, the frontend pass: redeploy to https://decaya.vercel.app, take screenshots at 360, 768 and 1280 px of every demo route (including the open menu and step 7 mid-drag), read them, and fix what they show. Signature 3 (AnimatePresence staging in `ClapCapture`) is still to build.

## Phase 5 log: frontend pass and submission package (2026-11-24)

### Goal
Fix what the eight BEFORE screenshots show, conform the shell to IDENTITY (D6, S5, L4, M6, K1), place six scene slots, ship signatures 2 and 3 on the first screen and on `/new`, and write the submission package (README.md, SUBMISSION.md, docs/SCREENSHOTS.md, LICENSE).

### Status
All three parts were written and nothing was cut. Nothing was built or run: the agent cannot run commands, so `npm run build`, `npm test` and `npm run proof` are unverified until the runner runs them. The screenshots predate the Phase 4 deploy (the phone header still shows inline links instead of the "Menu" button), so the mobile nav item was checked against code, not a new screenshot.

### Decisions
- **Body font gaps.** The screenshots show gaps inside words ("T hick curt ain", "List en t o"). `Source_Sans_3` now asks for weights 400, 600 and 700 (`app/layout.tsx:11` to `:16`), so Google serves static files instead of the variable one, and the Button lost `tracking-wide` (`components/ui/button.tsx:9`). This is the likeliest cause, but unverified until a new screenshot.
- **Bento (L4).** Six cells, unequal: live cell 7 cols x 2 rows, image 5, CTA 3, clap stamp 2, speech window 4, duvet vs foam 8. The claim in the live cell is now the product one-liner (h1 in two spans, `components/home-bento.tsx:63` to `:68`). The muted lead paragraph became one line naming the illustrative room. The CTA cell lists the three steps of DEMO step 2. The speech window cell is a 0 to 1.8 s scale with one tick per seeded room (`midRt60`). The duvet vs foam cell is two bars from `averageCut` with the item areas from the furnishing catalog. No fabricated number: every value comes from `lib/data/seed.ts` through the adapter, or from `predictRt60`.
- **Signature 2 on the first screen.** The live cell reuses `RoomSizeHandle` (no second drag implementation) plus a "Width in meters" box (`id="bento-width"`); both write one `dims` state, which feeds `predictRt60(featured.measured, dims, items)`. Arrow keys, PageUp/PageDown, Home/End and the box are the alternatives to dragging. With nothing pressed, the prediction equals the measurement at any width, so the line under the handle says to add an item first; the room size and volume always update.
- **Hover expand.** The clap stamp cell is a `motion.div` with `layout`, `whileHover` and `whileFocus` (scale 1.04) and reveals one extra line through `AnimatePresence initial={false}`. The outer grid cell keeps the CSS drop entrance, because a CSS animation with `fill-mode: both` would override motion's inline transform on the same element.
- **Signature 3.** `components/clap-capture.tsx`: the status line swaps inside a live region that stays mounted; the meter, an "analyzing" band row, the error card and the quality report swap in one `AnimatePresence mode="wait" initial={false}` with M6-shaped enter variants and a short exit. Per-clap rows stagger through `LIST`/`ROW` variants. All under `MotionConfig reducedMotion="user"`. Idle renders at full opacity in server HTML.
- **Signature 1.** Unchanged in `components/room-explorer.tsx`. The link from the Quick look card into the `/rooms/[slug]` hero was not added: a `layoutId` does not survive a route change in the App Router without a persistent layout wrapper, which was not cheap.
- **Fieldbook rows.** The punched hole (`decaya-specimen`) is off the list rows, because on screen it read as a radio button; specimen tags, the live cell and Quick look keep it. Owner lines wrap on phones and truncate only from `md`. "Clear" renders only when a filter is on.
- **Nav.** Four links now: Rooms, Example bench (the first adapter room, href built in the now async `app/layout.tsx`), Measure a room, Method. "Rooms" is active only on `/`; "Example bench" on any `/rooms/*` page.
- **Footer.** One sentence plus links to the repository and the hackathon. The hackathon URL `https://peninsula-innovation-hackathon.devpost.com/` was inferred from the event name; check that it resolves.
- **Scene slots (all six are SVG fallbacks, `public/brand/` is empty).** 1 `/` bento image cell (existing SVG), 2 `/rooms/[slug]` "Why the A/B is fair" (existing), 3 `/about` opening (existing), 4 `/new` capture step (new, square, hidden below `md`), 5 `/` empty search state inside `EmptyState` (new, wide), 6 `/about` closing (new). The spec suggested scene-4 for the room page; the existing scene-2 already shows the result there, and the existing SVGs were not edited (CLAUDE.md Never list), so the numbers follow what each drawing shows.
- **Simplification.** `/about` steps cut to one sentence each, the coefficient table folded in a `<details>` with a one-line summary, the closing card became scene-6 plus "Listen before you buy". `/new` intro is one sentence. The landing section under the bento is two sentences and one outline link, so the bento "Measure your room" is the one primary CTA. The `decaya-ruled` background was removed from text cards where the rules crossed text (bento speech window, `EmptyState`, `ClapCapture`); skeletons keep it.
- **Submission package.** README rewritten in the required order with a mermaid diagram of the real modules, PROOF blocks kept byte for byte, and an honest "cross-check not done" line. SUBMISSION.md follows the Devpost field order and leaves out the media field. LICENSE (MIT, "The Decaya authors") added because none existed. `public/audio/dry-speech.wav` does not exist (Glob), so the credits name the formant synth only.
- IDENTITY.md not touched; no Amendment was needed.

### Failed attempts
None.

### Files changed
.farm-delta.md (new, runner bookkeeping), SUBMISSION.md (new), LICENSE (new), docs/SCREENSHOTS.md (new), public/illustrations/scene-4.svg (new), public/illustrations/scene-5.svg (new), public/illustrations/scene-6.svg (new), app/layout.tsx, app/globals.css, app/page.tsx, app/new/page.tsx, app/about/page.tsx, app/rooms/[slug]/page.tsx, components/home-bento.tsx, components/clap-capture.tsx, components/room-explorer.tsx, components/nav-links.tsx, components/band-bars.tsx, components/states.tsx, components/new-room-form.tsx, components/ui/button.tsx, README.md, DEMO.md, HANDOFF.md, .farm-commits.json (runner only).

### Commands run
None, the agent cannot run commands.

### Acceptance gate, checked by reading files and running Grep
- Met: `.farm-delta.md` has 11 Diagnosis items, 23 Changes rows (14 A, 9 B), one Kept row; every proof-gone has 0 matches and every proof-new at least 1 (counts recorded there).
- Met: dead-string grep 0; raw hex only in `app/globals.css` (11 IDENTITY values), `app/icon.svg`, `app/opengraph-image.tsx`; one keyframe, `decaya-drop`; banned props 0.
- Met: `app/layout.tsx:3` imports `Fraunces` and `Source_Sans_3` from `next/font/google`; the header brand link holds `<BrandMark />` plus "Decaya" only.
- Met: no bare `<button`, `<input`, `<select` outside `components/ui/`.
- Met: six `<SceneSlot n={N}` tags with literal n, alt, width, height (1 to 6), six SVG files, no comments in any SVG.
- Met: `package.json` keeps `"motion": "^14.14.0"`; six files import `motion/react`, all start with `"use client"`.
- Met: README.md, SUBMISSION.md, docs/ have 0 hits for the banned strings, "video", "pending", dashes and the banned vocabulary.
- Unverified (runner): the build, the 11 tests, the proof rewrite, and that `layout` plus `whileHover` on the stamp cell and the `as const` ease tuple in `components/clap-capture.tsx` type-check under motion 14.

### Open questions
- Does the font change remove the letter gaps? Needs a new screenshot after the deploy.
- Is the hackathon URL in the footer and SUBMISSION-adjacent text correct (`app/layout.tsx`, `HACKATHON_URL`)?
- `app/layout.tsx` is now `async` and calls `getAdapter().listRooms()` on every request for the nav link. Cheap (seed data in memory), but if the build complains about the layout reading the adapter, hard-code nothing: drop the `benchHref` prop and the nav falls back to three links.
- Signature 1 does not continue into the `/rooms/[slug]` hero (see Decisions).

### Next best step
Phases 6 and 7: redeploy, take the AFTER screenshots at 360, 768 and 1280 px, compare them with the BEFORE shots defect by defect, apply the judge rounds, then freeze and tag.

### Manual submit checklist
- [ ] Confirm every team member is a student (eligibility).
- [ ] Fill in the team member names on the Devpost team page.
- [ ] Add a CC0 dry speech clip at `public/audio/dry-speech.wav` and its credit line in README "Credits" and SUBMISSION.md.
- [ ] Run the iOS Safari and Android Chrome checks on https://decaya.vercel.app (mic prompt, drag on the bento and the bench, no sideways scroll at 360 px).
- [ ] Fill the README room test table with real numbers, including the cross-check of 3 rooms against an iOS clap app.
- [ ] Rehearse the wow moment (DEMO step 5) twice on the recording device.
- [ ] Record the demo video and paste its link straight into the Devpost form.
- [ ] Confirm the submission deadline: 10 December 2026, 17:00 EST.

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
- `lib/types.ts`: shared types and `ApiResponse<T>`. `lib/data/seed.ts`: 10 seeded rooms and 6 furnishings. `lib/adapter.ts`: `getAdapter()` seam. `lib/data.ts`: shim plus `averageCut`, `fixFor`, `ROOM_TYPES`, `ROOM_USES`, `measurementNote`. `lib/store.ts`: the only localStorage wrapper (`readRooms`, `saveRoom`, `clearRooms`, `subscribeRooms`), read in components through `useLocalRooms()`.
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
- `lib/store.ts`: localStorage only, so measured rooms live on one device (decision in the Phase 3 log).
- `realAdapter` in `lib/adapter.ts` serves the validated seed fieldbook through `withFallback`; there is no server store.
- Seed rooms in `lib/data/seed.ts` are plausible illustrative data, not measurements. Replace or add real measurements from the team's own rooms before submitting and say so in the README.

### Interaction kit (K1 motion)

- Shipped: **signature 1, shared-layout transition.** On `/`, "Quick look" on a fieldbook row grows that row into the expanded specimen card via `layoutId={`room-${slug}`}` (`components/room-explorer.tsx`), driven by the seeded room, with its band bars and cheapest fix plan.
- Shipped (Phases 4 and 5): **signature 2**, the draggable room width (`components/room-size-handle.tsx`) on the bench and in the bento live cell; the predicted bars move through `predictRt60`.
- Shipped (Phase 5): **signature 3**, `AnimatePresence` staging in `components/clap-capture.tsx` with per-clap rows staggered through `variants`.

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
