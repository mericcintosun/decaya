// The single persistence wrapper for rooms measured in this browser. This is the only
// file that touches localStorage. No React here: components read rooms through
// useLocalRooms() in components/use-local-rooms.ts, which is built on these functions.
//
// Why localStorage and not KV or Postgres: see "Phase 3 log, Decisions" in HANDOFF.md.
// Rooms are per visitor, private and small, no demo step needs them on another device,
// and the builder cannot provide a store credential.
import { coreError, type CoreError } from "./errors";
import { storedRoomSchema } from "./schemas";
import type { Room } from "./types";

export const STORAGE_KEY = "decaya.rooms.v1";

export interface StoreResult {
  rooms: Room[];
  /** Entries that were present but failed storedRoomSchema, so they were dropped. */
  skipped: number;
  /** Set when the stored value could not be read at all (corrupt JSON or blocked storage). */
  failed?: CoreError;
}

export type SaveResult = { ok: true; room: Room } | ({ ok: false } & CoreError);

const EMPTY: StoreResult = { rooms: [], skipped: 0 };
const BLOCKED: StoreResult = { rooms: [], skipped: 0, failed: coreError("parse_failure") };

/** Storage, or null when this runtime has none or the browser refuses access. */
function storage(): Storage | null {
  try {
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

/** Raw stored string. Throws only when storage exists but refuses the read. */
function readRaw(): string | null {
  const s = storage();
  return s ? s.getItem(STORAGE_KEY) : null;
}

/** Parses a raw stored string. Never throws. */
export function parseRooms(raw: string | null): StoreResult {
  if (raw === null || raw === "") return EMPTY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { rooms: [], skipped: 0, failed: coreError("parse_failure") };
  }
  if (!Array.isArray(parsed)) return { rooms: [], skipped: 0, failed: coreError("parse_failure") };
  const rooms: Room[] = [];
  let skipped = 0;
  for (const entry of parsed) {
    const r = storedRoomSchema.safeParse(entry);
    if (r.success) rooms.push(r.data);
    else skipped++;
  }
  return { rooms, skipped };
}

// Snapshot cache: the same object comes back while the raw string is unchanged, so
// useSyncExternalStore sees a stable snapshot and does not loop.
let cachedRaw: string | null | undefined;
let cachedResult: StoreResult = EMPTY;

/** Rooms saved in this browser, newest first. Invalid entries are dropped and counted. Never throws. */
export function readRooms(): StoreResult {
  let raw: string | null;
  try {
    raw = readRaw();
  } catch {
    return BLOCKED;
  }
  if (raw === cachedRaw) return cachedResult;
  cachedRaw = raw;
  cachedResult = parseRooms(raw);
  return cachedResult;
}

const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

/**
 * Saves a room. Idempotency: upsert by slug. If a room with this slug is already
 * stored it is replaced in place and no second entry is added; a new slug goes first.
 * A double click or a retry with the same slug therefore never creates two rooms.
 */
export function saveRoom(room: Room): SaveResult {
  const checked = storedRoomSchema.safeParse(room);
  if (!checked.success) return { ok: false, ...coreError("invalid_input") };
  const next = checked.data;
  const current = readRooms().rooms;
  const idx = current.findIndex((r) => r.slug === next.slug);
  const rooms = idx >= 0 ? current.map((r, i) => (i === idx ? next : r)) : [next, ...current];
  try {
    const s = storage();
    if (!s) throw new Error("no storage");
    s.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    return {
      ok: false,
      ...coreError(
        "not_configured",
        "This browser would not keep the room. Allow site storage, or use a normal window, and try again.",
      ),
    };
  }
  notify();
  return { ok: true, room: next };
}

/** Removes every room measured in this browser. Seeded rooms are not stored here, so they stay. */
export function clearRooms(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: nothing was readable, so there is nothing to clear.
  }
  notify();
}

/** Calls cb when rooms change in this tab (save, clear) or in another tab (storage event). */
export function subscribeRooms(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) cb();
  };
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (hasWindow) window.removeEventListener("storage", onStorage);
  };
}
