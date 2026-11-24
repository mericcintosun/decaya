// The one data seam, and the only file that reads ADAPTER_MODE. Pages and API routes read
// rooms and furnishings through getAdapter(); server pages pass getAdapter().mode down to
// client components, which pick a measurement engine with getEngine(mode) in lib/engine.ts.
import { SEED_FURNISHINGS, SEED_ROOMS } from "./data/seed";
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
 * Real mode. The real work is the measurement engine (realEngine in lib/engine.ts:
 * microphone, raw PCM capture, octave filters, Schroeder and T20, all in the browser).
 * The room methods still serve the seeded fieldbook, because measured rooms live in the
 * visitor's browser (localStorage) and there is no server store. They stay on fixtures.
 */
export const realAdapter: RoomAdapter = {
  mode: "real",
  listRooms: () => fakeAdapter.listRooms(),
  getRoom: (slug) => fakeAdapter.getRoom(slug),
  listFurnishings: () => fakeAdapter.listFurnishings(),
};

/** Reads ADAPTER_MODE. "real" picks the real side; anything else (or unset) means fake. */
export function getAdapter(): RoomAdapter {
  return process.env.ADAPTER_MODE === "real" ? realAdapter : fakeAdapter;
}
