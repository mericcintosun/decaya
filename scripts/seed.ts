// Writes fixtures/seed.json from lib/data/seed.ts. Deterministic: stable key order,
// no timestamp, so running it twice gives the same bytes. Run with `npm run seed`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

const payload = sortKeys({
  furnishings: SEED_FURNISHINGS,
  note: "Illustrative seed rooms, not measurements the team took.",
  rooms: SEED_ROOMS,
});

const dir = join(process.cwd(), "fixtures");
mkdirSync(dir, { recursive: true });
const file = join(dir, "seed.json");
writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`seed: wrote ${SEED_ROOMS.length} rooms and ${SEED_FURNISHINGS.length} furnishings to fixtures/seed.json`);
