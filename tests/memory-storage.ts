// A tiny in-memory localStorage stand-in for Node, used by tests/store.test.ts and
// scripts/proof-core.ts. Not a test file itself (no .test.ts suffix).
import type { Room } from "../lib/types";

/** A valid room as a visitor would save it. Fixed values, no clock. */
export const TEST_ROOM: Room = {
  slug: "test-dorm-ab12",
  name: "Test dorm",
  owner: "You",
  city: "Unlisted",
  type: "dorm",
  use: "podcast",
  dims: { length: 4, width: 3, height: 2.6 },
  measured: [0.97, 0.93, 0.88, 0.83, 0.7],
  claps: { valid: 3, total: 3 },
  dynamicRangeDb: 42,
  measuredOn: "2026-11-24",
  notes: "Sample data: these values are a stored example measurement, no microphone was used.",
  source: "local",
};

export interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

export function createMemoryStorage(options: { blocked?: boolean } = {}): MemoryStorage {
  const map = new Map<string, string>();
  const guard = () => {
    if (options.blocked) throw new Error("storage blocked");
  };
  return {
    getItem(key) {
      guard();
      return map.has(key) ? (map.get(key) as string) : null;
    },
    setItem(key, value) {
      guard();
      map.set(key, String(value));
    },
    removeItem(key) {
      guard();
      map.delete(key);
    },
    clear() {
      map.clear();
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    get length() {
      return map.size;
    },
  };
}

/** Puts the stub on globalThis.localStorage (defineProperty, since Node may ship a getter). */
export function installStorage(storage: MemoryStorage): void {
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
}
