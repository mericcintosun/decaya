// Shared types for Decaya. Pages, components, the adapter and the API routes import from here.
import type { BandValues, Furnishing, RoomDims, Verdict } from "./acoustics";

export type { BandValues, Furnishing, RoomDims, Verdict };

export type RoomType = "dorm" | "bedroom" | "studio" | "bathroom" | "study" | "garage" | "closet" | "living";
export type RoomUse = "podcast" | "vocals" | "lectures" | "streaming";

export interface Room {
  slug: string;
  name: string;
  owner: string;
  city: string;
  type: RoomType;
  use: RoomUse;
  dims: RoomDims;
  /** RT60 in seconds at 250, 500, 1k, 2k, 4k Hz. Seed rooms carry illustrative values. */
  measured: BandValues;
  claps: { valid: number; total: number };
  /** How far the clap peak stood above the noise floor. */
  dynamicRangeDb: number;
  measuredOn: string;
  notes: string;
  source: "fieldbook" | "local";
}

/** The one response shape every API route returns. */
export type ApiResponse<T> =
  | { ok: true; data: T; mode: "fake" | "real" }
  | { ok: false; error: { code: string; message: string } };
