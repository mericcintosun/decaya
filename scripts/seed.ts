// Writes fixtures/seed.json from lib/data/seed.ts. Deterministic: stable key order,
// no timestamp, so running it twice gives the same bytes. Run with `npm run seed`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSeedJson, SEED_COUNTS } from "./seed-data";

const dir = join(process.cwd(), "fixtures");
mkdirSync(dir, { recursive: true });
const file = join(dir, "seed.json");
writeFileSync(file, buildSeedJson(), "utf8");
console.log(`seed: wrote ${SEED_COUNTS.rooms} rooms and ${SEED_COUNTS.furnishings} furnishings to fixtures/seed.json`);
