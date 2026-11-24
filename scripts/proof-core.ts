// Prints one JSON object with the core proofs. Called by scripts/proof.mjs (via tsx).
// Synthetic-signal checks and a model prediction only: none of this is a room measurement.
import { existsSync } from "node:fs";
import { join } from "node:path";
import fixture from "../fixtures/measurement.json";
import { midRt60, predictRt60, schroederDb, t20, type BandValues, type RoomDims } from "../lib/acoustics";
import { SEED_FURNISHINGS } from "../lib/data/seed";
import { readRooms, saveRoom, STORAGE_KEY } from "../lib/store";
import { createMemoryStorage, installStorage, TEST_ROOM } from "../tests/memory-storage";

const SAMPLE_RATE = 8000;
const TRUE_RT = 0.9;

const n = Math.round(SAMPLE_RATE * 2.5);
const energy = new Float32Array(n);
for (let i = 0; i < n; i++) energy[i] = Math.pow(10, (-6 * (i / SAMPLE_RATE)) / TRUE_RT);
const fitted = t20(schroederDb(energy), SAMPLE_RATE);

const dims: RoomDims = { length: 4, width: 3, height: 2.6 };
const measured = fixture.bands as BandValues;
const items = SEED_FURNISHINGS.filter((f) => f.id === "heavy-curtain" || f.id === "duvet-wall");
const after = predictRt60(measured, dims, items);

// Store checks (lib/store.ts) against an in-memory localStorage stand-in.
function storeChecks() {
  installStorage(createMemoryStorage());
  saveRoom(TEST_ROOM);
  saveRoom({ ...TEST_ROOM, name: "Test dorm, saved again" });
  const roomsAfterDoubleSave = readRooms().rooms.length;

  const corrupt = createMemoryStorage();
  corrupt.setItem(STORAGE_KEY, "{not json");
  installStorage(corrupt);
  let corruptThrew = false;
  let corruptFailed: string | null = null;
  try {
    corruptFailed = readRooms().failed?.error ?? null;
  } catch {
    corruptThrew = true;
  }

  const partial = createMemoryStorage();
  const { measured: _drop, ...broken } = TEST_ROOM;
  void _drop;
  partial.setItem(STORAGE_KEY, JSON.stringify([TEST_ROOM, { ...broken, slug: "broken-room-ef56" }]));
  installStorage(partial);
  const partialRead = readRooms();

  return {
    roomsAfterDoubleSave,
    corruptThrew,
    corruptFailed,
    missingMeasuredKept: partialRead.rooms.length,
    missingMeasuredSkipped: partialRead.skipped,
  };
}

const result = {
  store: storeChecks(),
  syntheticDecay: {
    trueRt60: TRUE_RT,
    sampleRate: SAMPLE_RATE,
    t20: fitted,
    errorPercent: fitted === null ? null : (Math.abs(fitted - TRUE_RT) / TRUE_RT) * 100,
  },
  demoPrediction: {
    dims,
    items: items.map((i) => i.name),
    beforeMid: midRt60(measured),
    afterMid: midRt60(after),
  },
  dryVoiceFile: existsSync(join(process.cwd(), "public", "audio", "dry-speech.wav")),
};

console.log(JSON.stringify(result));
