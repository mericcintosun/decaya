// Builds the text of fixtures/seed.json from lib/data/seed.ts. Pure: no file access,
// no clock, stable key order. Used by scripts/seed.ts and scripts/demo-reset.ts.
import { SEED_FURNISHINGS, SEED_ROOMS } from "../lib/data/seed";

/** Recursively sorts object keys so the output does not depend on insertion order. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = sortKeys(obj[key]);
    return out;
  }
  return value;
}

/** The exact bytes written to fixtures/seed.json. */
export function buildSeedJson(): string {
  const payload = sortKeys({
    furnishings: SEED_FURNISHINGS,
    note: "Illustrative seed rooms, not measurements the team took.",
    rooms: SEED_ROOMS,
  });
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export const SEED_COUNTS = { rooms: SEED_ROOMS.length, furnishings: SEED_FURNISHINGS.length };
