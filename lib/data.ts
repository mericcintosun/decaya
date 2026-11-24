// Thin shim kept so existing "@/lib/data" importers keep working.
// Types live in lib/types.ts, the seeded fieldbook in lib/data/seed.ts, and pages
// read seed data through getAdapter() in lib/adapter.ts.
import { bestFix, midRt60, predictRt60 } from "./acoustics";
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

/* ---------- Rooms measured in this browser (no server: localStorage) ---------- */

const STORAGE_KEY = "decaya.rooms.v1";

// TODO: swap this localStorage adapter for a shared store (for example Vercel KV)
// if rooms should be visible across devices. Same two functions, same Room shape.
export function loadLocalRooms(): Room[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Room[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalRoom(room: Room): void {
  const others = loadLocalRooms().filter((r) => r.slug !== room.slug);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([room, ...others]));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
