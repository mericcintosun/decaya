// Thin shim kept so existing "@/lib/data" importers keep working.
// Types live in lib/types.ts, the seeded fieldbook in lib/data/seed.ts, and pages
// read seed data through getAdapter() in lib/adapter.ts.
import { bestFix, midRt60, predictRt60, type Measurement } from "./acoustics";
import { SEED_FURNISHINGS, SEED_ROOMS } from "./data/seed";
import type { Furnishing, Room, RoomType, RoomUse } from "./types";

export { SEED_FURNISHINGS, SEED_ROOMS };
export type { ApiResponse, BandValues, Furnishing, Room, RoomDims, RoomType, RoomUse, Verdict } from "./types";

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "dorm", label: "Dorm room" },
  { value: "bedroom", label: "Bedroom" },
  { value: "studio", label: "Studio apartment" },
  { value: "living", label: "Living room" },
  { value: "study", label: "Study room" },
  { value: "bathroom", label: "Bathroom" },
  { value: "garage", label: "Garage" },
  { value: "closet", label: "Closet" },
];

export const ROOM_USES: { value: RoomUse; label: string }[] = [
  { value: "podcast", label: "Podcast" },
  { value: "vocals", label: "Vocals and covers" },
  { value: "lectures", label: "Online classes" },
  { value: "streaming", label: "Streaming" },
];

/** Cheapest plan for a room from the furnishing catalog (defaults to the seeded catalog). */
export function fixFor(room: Pick<Room, "measured" | "dims">, catalog: Furnishing[] = SEED_FURNISHINGS) {
  return bestFix(room.measured, room.dims, catalog);
}

/** Average mid-band reduction one item brings across rooms that are too live. */
export function averageCut(itemId: string, pool: Room[] = SEED_ROOMS, catalog: Furnishing[] = SEED_FURNISHINGS): number {
  const item = catalog.find((f) => f.id === itemId);
  const live = pool.filter((r) => midRt60(r.measured) > 0.5);
  if (!item || live.length === 0) return 0;
  const cuts = live.map((r) => 1 - midRt60(predictRt60(r.measured, r.dims, [item])) / midRt60(r.measured));
  return cuts.reduce((s, c) => s + c, 0) / cuts.length;
}

/* ---------- Rooms measured in this browser ---------- */
// Storage lives in lib/store.ts (readRooms, saveRoom, clearRooms, subscribeRooms).
// The store decision (localStorage, with KV and Postgres rejected) is recorded in
// HANDOFF.md under "Phase 3 log, Decisions".

/**
 * The note saved with a room. It follows the measurement, not the page mode, so a
 * sample used as a fallback in real mode is never recorded as a live measurement.
 */
export function measurementNote(m: Pick<Measurement, "capturePath" | "validCount" | "confidence">): string {
  return m.capturePath === "fixture"
    ? "Sample data: these values are a stored example measurement, no microphone was used."
    : `Measured in this browser with ${m.validCount} usable claps, ${m.confidence} confidence.`;
}

/** Length caps that match storedRoomSchema in lib/schemas.ts. */
export const FIELD_LIMITS = { name: 120, owner: 80, city: 80 } as const;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
