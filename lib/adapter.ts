// The one data seam. Pages and API routes read rooms and furnishings through getAdapter().
import { SEED_FURNISHINGS, SEED_ROOMS } from "./data/seed";
import type { Furnishing, Room } from "./types";

export type AdapterMode = "fake" | "real";

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
 * Honest stub. Real rooms are measured in the visitor's browser and kept in that
 * browser's localStorage, so the server has nothing of its own to serve yet. Until
 * Phase 2 decides what (if anything) moves server-side, this delegates to the fake adapter.
 */
export const realAdapter: RoomAdapter = {
  mode: "real",
  listRooms: () => fakeAdapter.listRooms(),
  getRoom: (slug) => fakeAdapter.getRoom(slug),
  listFurnishings: () => fakeAdapter.listFurnishings(),
};

/** Reads ADAPTER_MODE. "real" picks the real adapter; anything else (or unset) means fake. */
export function getAdapter(): RoomAdapter {
  return process.env.ADAPTER_MODE === "real" ? realAdapter : fakeAdapter;
}
