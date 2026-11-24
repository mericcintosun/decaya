# DEMO: Decaya in 90 seconds

**Problem:** a bedroom recording sounds like a bathroom, and the cause is the room, not the mic.

**Trigger:** three claps in the middle of the room.

**Wow moment:** the judge hears the same sentence in the room as it is, then with a thick curtain and a duvet added, and the difference is obvious on laptop speakers without buying anything.

**Start route:** `/`

**Closing line:** "Listen before you buy. Decaya, in your browser, no install."

## Steps

Every step names the route file that renders it. Seeded rooms are illustrative examples, not measurements the team took; every number after an item is added is labelled a prediction.

1. **Open `/`** (`app/page.tsx`, `components/home-bento.tsx`). The bento's largest cell is the live furnishing preview on a seeded dorm room: tap "Thick curtain" and "Duvet on the wall" and the predicted band bars drop toward the green speech strip. Optional: drag the width handle under the bars (arrow keys or the "Width in meters" box do the same) and the predicted bars rise as the room widens. (0 to 10 s)
2. **Open `/new`** (`app/new/page.tsx`, `components/new-room-form.tsx`, `components/clap-capture.tsx`). Name the room, clap three times, and the stamp reads "3 of 3 claps valid". Save to the fieldbook. (10 to 25 s)
3. **See the number and the curve on `/rooms/[slug]`** (`app/rooms/[slug]/page.tsx`, `components/room-bench.tsx`). The mid-band decay (around 0.9 s in a dorm) and the decay curve falling past the green wedge. Line: "It is not the mic, it is the room." (25 to 45 s)
4. **Enter the room size and add thick curtain and duvet** (same route, the simulator card "What would you add?" in `components/room-bench.tsx`). Room size 3 x 4 x 2.6 m. Leave only "Thick curtain" and "Duvet on the wall" pressed. The predicted bars drop into the strip; toggle "Foam panels" to show it does less. (45 to 70 s)
5. **Tap "Your room now", then "With thick curtain + duvet on the wall"** (same route, `ListenAB` in `components/room-bench.tsx`). Same phrase, same loudness, only the decay changes. (70 to 85 s)
6. **Close the loop on `/`** (`app/page.tsx`, `components/room-explorer.tsx`). The new room sits at the top of the fieldbook. Point at `/about` (`app/about/page.tsx`) for the method and its limits, then say the closing line. (85 to 90 s)
7. **Drag the room wider on `/rooms/[slug]`** (`app/rooms/[slug]/page.tsx`, `components/room-bench.tsx`, `components/room-size-handle.tsx`). Optional in the 90 s script: use it if steps 1 to 6 finish early, otherwise show it after the closing line. In the simulator card "What would you add?", with "Thick curtain" and "Duvet on the wall" still pressed, drag the handle under "Predicted, from your room size" from 3 m to 5 m (finger on a phone, mouse on a laptop; arrow keys or the width box do the same). Expected result: the predicted mid-band decay rises (about 0.47 s to about 0.59 s on the sample measurement in a 4 x 3 x 2.6 m room, worked out by hand from `predictRt60`; check it on the deploy) and the predicted band bars move live, because the same curtain and duvet cover less of a bigger room. Every number shown is labelled a prediction. The handle is on the bench that step 3 already opened, so no URL typing is needed.

## Data path

Pages read seeded rooms and furnishings through `getAdapter()` in `lib/adapter.ts` (`ADAPTER_MODE=fake` by default), the only file that reads `ADAPTER_MODE`. The same data is served as JSON by `app/api/rooms/route.ts`, `app/api/rooms/[slug]/route.ts` and `app/api/furnishings/route.ts`. Server pages pass `getAdapter().mode` to the client components, which pick the measurement engine with `getEngine(mode)` in `lib/engine.ts`: `realEngine` records the microphone and analyzes it in the browser (step 2 shows "Live measurement"), `fakeEngine` loads `fixtures/measurement.json` with no microphone (step 2 shows "Sample data"). Step 5 plays the same way in both modes; only the dry voice source differs (the fake engine always uses the formant synth). Rooms measured in the browser are saved through `lib/store.ts` (localStorage, upsert by slug, so a double click stores one room) and read back on `/` and `/rooms/[slug]` through the single `useLocalRooms()` hook in `components/use-local-rooms.ts`, which also refreshes `/` after a save without a reload. If the microphone fails in step 2, "Use the sample measurement" loads `fixtures/measurement.json` and the saved room is labelled "Sample data".
