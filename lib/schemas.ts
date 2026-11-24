// Input and fixture schemas (zod 3). Route params, the fixture measurement and stored
// rooms are checked against these before use.
import { z } from "zod";
import type { Measurement } from "./acoustics";
import type { Room } from "./types";

/** Lowercase letters, digits and single hyphens, at most 80 characters. */
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "A slug uses lowercase letters, digits and hyphens.");

const bandValue = z.number().finite().min(0.05).max(10);

/** RT60 in seconds at 250, 500, 1k, 2k, 4k Hz. */
export const bandValuesSchema = z.tuple([bandValue, bandValue, bandValue, bandValue, bandValue]);

const meters = z.number().finite().min(0.5).max(50);

export const roomDimsSchema = z.object({
  length: meters,
  width: meters,
  height: meters,
});

export const clapReportSchema = z.object({
  index: z.number().int().min(1),
  valid: z.boolean(),
  clipped: z.boolean(),
  dynamicRangeDb: z.number().finite(),
  bands: z.array(z.number().finite().nullable()).length(5),
  reason: z.string().nullable(),
});

/** Mirrors Measurement in lib/acoustics.ts. */
export const measurementSchema = z.object({
  bands: bandValuesSchema,
  claps: z.array(clapReportSchema).min(1),
  validCount: z.number().int().min(0),
  dynamicRangeDb: z.number().finite(),
  curveDb: z.array(z.number().finite()),
  curveStepSec: z.number().positive(),
  confidence: z.enum(["high", "medium", "low"]),
  processingWarning: z.boolean(),
  capturePath: z.enum(["worklet", "mediarecorder", "fixture"]).optional(),
});

/** Mirrors Room in lib/types.ts. */
export const storedRoomSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  owner: z.string().max(80),
  city: z.string().max(80),
  type: z.enum(["dorm", "bedroom", "studio", "bathroom", "study", "garage", "closet", "living"]),
  use: z.enum(["podcast", "vocals", "lectures", "streaming"]),
  dims: roomDimsSchema,
  measured: bandValuesSchema,
  claps: z.object({ valid: z.number().int().min(0), total: z.number().int().min(0) }),
  dynamicRangeDb: z.number().finite(),
  measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string(),
  source: z.enum(["fieldbook", "local"]),
});

// Compile-time checks: a parsed value must be usable as the shared type. If a field is
// added to Measurement or Room without its schema, the build fails here.
export const asMeasurement = (x: z.infer<typeof measurementSchema>): Measurement => x;
export const asRoom = (x: z.infer<typeof storedRoomSchema>): Room => x;
