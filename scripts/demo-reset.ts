// npm run demo:reset: returns the demo to its start state.
// 1. Builds fixtures/seed.json twice in memory and stops if the two differ (the seed
//    must be deterministic, so every demo cycle starts from the same fieldbook).
// 2. Writes it, and checks the fieldbook still has 10 rooms and 6 furnishings.
// 3. Prints the browser step: rooms a visitor measured live in that browser
//    (lib/store.ts, localStorage), so no script can reach them.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSeedJson, SEED_COUNTS } from "./seed-data";

const first = buildSeedJson();
const second = buildSeedJson();
if (first !== second) {
  throw new Error("demo:reset: fixtures/seed.json is not deterministic, two builds differ.");
}
if (SEED_COUNTS.rooms !== 10 || SEED_COUNTS.furnishings !== 6) {
  throw new Error(
    `demo:reset: expected 10 rooms and 6 furnishings, found ${SEED_COUNTS.rooms} and ${SEED_COUNTS.furnishings}.`,
  );
}

const dir = join(process.cwd(), "fixtures");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "seed.json"), first, "utf8");

console.log(`demo:reset: fixtures/seed.json rebuilt (${SEED_COUNTS.rooms} rooms, ${SEED_COUNTS.furnishings} furnishings), two builds identical.`);
console.log("demo:reset: in the browser, open / and press \"Clear rooms measured here\" (or use a private window).");
console.log("demo:reset: then walk DEMO.md from step 1.");
