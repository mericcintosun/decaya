// Core checks on pure functions only (no Web Audio). Fixed inputs, no randomness, no clock.
// Run with `npm test` (node:test through tsx).
import { test } from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/measurement.json";
import { midRt60, predictRt60, schroederDb, t20, verdictFor, type BandValues, type RoomDims } from "../lib/acoustics";
import { SEED_FURNISHINGS } from "../lib/data/seed";
import { measurementSchema, slugSchema } from "../lib/schemas";

const SAMPLE_RATE = 8000;

/** Energy of an ideal exponential decay that falls 60 dB in rt seconds, over 2.5 s. */
function syntheticDecay(rt: number): Float32Array {
  const n = Math.round(SAMPLE_RATE * 2.5);
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) e[i] = Math.pow(10, (-6 * (i / SAMPLE_RATE)) / rt);
  return e;
}

function fitRt(rt: number): number {
  const fitted = t20(schroederDb(syntheticDecay(rt)), SAMPLE_RATE);
  assert.notEqual(fitted, null, "T20 should fit a clean exponential decay");
  return fitted as number;
}

const DEMO_DIMS: RoomDims = { length: 4, width: 3, height: 2.6 };
const byId = (id: string) => {
  const f = SEED_FURNISHINGS.find((x) => x.id === id);
  assert.ok(f, `seed furnishing ${id} exists`);
  return f;
};

test("T20 recovers a 0.9 s synthetic decay within 10 percent", () => {
  const rt = fitRt(0.9);
  assert.ok(Math.abs(rt - 0.9) / 0.9 < 0.1, `got ${rt}`);
});

test("T20 recovers a 0.4 s synthetic decay within 10 percent", () => {
  const rt = fitRt(0.4);
  assert.ok(Math.abs(rt - 0.4) / 0.4 < 0.1, `got ${rt}`);
});

test("predictRt60 with no items returns the measured bands", () => {
  const measured: BandValues = [0.97, 0.93, 0.88, 0.83, 0.7];
  const predicted = predictRt60(measured, DEMO_DIMS, []);
  predicted.forEach((v, i) => assert.ok(Math.abs(v - measured[i]) < 1e-9, `band ${i}: ${v} vs ${measured[i]}`));
});

test("curtain plus duvet lowers the demo room more than foam alone", () => {
  const measured = fixture.bands as BandValues;
  const curtainDuvet = midRt60(predictRt60(measured, DEMO_DIMS, [byId("heavy-curtain"), byId("duvet-wall")]));
  const foam = midRt60(predictRt60(measured, DEMO_DIMS, [byId("foam-panels")]));
  assert.ok(curtainDuvet < midRt60(measured), `curtain + duvet ${curtainDuvet} vs measured ${midRt60(measured)}`);
  assert.ok(foam > curtainDuvet, `foam ${foam} should cut less than curtain + duvet ${curtainDuvet}`);
});

test("verdicts and schemas", () => {
  assert.equal(verdictFor(0.35), "speech-ready");
  assert.equal(verdictFor(0.6), "a-bit-live");
  assert.equal(verdictFor(1.0), "too-live");

  assert.equal(measurementSchema.safeParse(fixture).success, true);
  assert.equal(measurementSchema.safeParse({ ...fixture, bands: [0.9, 0.9, 0.9, 0.9] }).success, false);
  assert.equal(measurementSchema.safeParse({ ...fixture, bands: [0.9, 0.9, "x", 0.9, 0.9] }).success, false);

  assert.equal(slugSchema.safeParse("founders-hall-3f-double").success, true);
  assert.equal(slugSchema.safeParse("../x").success, false);
});
