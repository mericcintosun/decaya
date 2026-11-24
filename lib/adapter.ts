// The one data seam, and the only file that reads ADAPTER_MODE. Pages and API routes read
// rooms and furnishings through getAdapter(); server pages pass getAdapter().mode down to
// client components, which pick a measurement engine with getEngine(mode) in lib/engine.ts.
import { LOG_PREFIX } from "./config";
import { SEED_FURNISHINGS, SEED_ROOMS } from "./data/seed";
import { slugSchema, storedRoomSchema } from "./schemas";
import type { AdapterMode, Furnishing, Room } from "./types";

export type { AdapterMode };

export interface RoomAdapter {
  mode: AdapterMode;
  listRooms(): Promise<Room[]>;
  getRoom(slug: string): Promise<Room | null>;
  listFurnishings(): Promise<Furnishing[]>;
}

/** Serves the seeded fieldbook. Returns copies so callers cannot mutate the seed. */
export const fakeAdapter: RoomAdapter = {
  mode: "fake",
  async listRooms() {
    return SEED_ROOMS.map((r) => ({ ...r }));
  },
  async getRoom(slug) {
    const room = SEED_ROOMS.find((r) => r.slug === slug);
    return room ? { ...room } : null;
  },
  async listFurnishings() {
    return SEED_FURNISHINGS.map((f) => ({ ...f }));
  },
};

/**
 * Runs the real call; on a thrown error or an empty result it logs LOG_PREFIX plus an
 * ErrorCode only (no message text, no payload) and returns the fake adapter's answer.
 */
async function withFallback<T>(
  method: string,
  real: () => Promise<T>,
  fallback: () => Promise<T>,
  isEmpty: (value: T) => boolean,
): Promise<T> {
  try {
    const value = await real();
    if (!isEmpty(value)) return value;
    console.warn(`${LOG_PREFIX} adapter ${method}: not_found, using fallback`);
  } catch {
    console.warn(`${LOG_PREFIX} adapter ${method}: upstream_error, using fallback`);
  }
  return fallback();
}

/**
 * The real room source on the server. There is no server store (rooms a visitor measures
 * live in their browser, lib/store.ts), so the server's real data is the fieldbook, and
 * every entry is validated against storedRoomSchema before it is served.
 */
const realSource = {
  async listRooms(): Promise<Room[]> {
    return SEED_ROOMS.filter((r) => storedRoomSchema.safeParse(r).success).map((r) => ({ ...r }));
  },
  async getRoom(slug: string): Promise<Room | null> {
    if (!slugSchema.safeParse(slug).success) return null;
    const room = SEED_ROOMS.find((r) => r.slug === slug);
    return room && storedRoomSchema.safeParse(room).success ? { ...room } : null;
  },
  async listFurnishings(): Promise<Furnishing[]> {
    return SEED_FURNISHINGS.map((f) => ({ ...f }));
  },
};

/**
 * Real mode. The real work is the measurement engine (realEngine in lib/engine.ts:
 * microphone, raw PCM capture, octave filters, Schroeder and T20, all in the browser).
 * Each room method runs the validated real source through withFallback.
 */
export const realAdapter: RoomAdapter = {
  mode: "real",
  listRooms: () => withFallback("listRooms", realSource.listRooms, fakeAdapter.listRooms, (v) => v.length === 0),
  getRoom: (slug) =>
    withFallback("getRoom", () => realSource.getRoom(slug), () => fakeAdapter.getRoom(slug), (v) => v === null),
  listFurnishings: () =>
    withFallback("listFurnishings", realSource.listFurnishings, fakeAdapter.listFurnishings, (v) => v.length === 0),
};

/** Reads ADAPTER_MODE. "real" picks the real side; anything else (or unset) means fake. */
export function getAdapter(): RoomAdapter {
  return process.env.ADAPTER_MODE === "real" ? realAdapter : fakeAdapter;
}
