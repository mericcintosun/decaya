// Shared types for Decaya. Pages, components, the adapter and the API routes import from here.
import type { BandValues, Furnishing, RoomDims, Verdict } from "./acoustics";
import type { CoreError } from "./errors";

export type { BandValues, Furnishing, RoomDims, Verdict };

/** Which side of the seam is live. Read from ADAPTER_MODE in lib/adapter.ts only. */
export type AdapterMode = "fake" | "real";

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

/** The one response shape every API route returns. Failures carry a typed code and one human sentence. */
export type ApiResponse<T> = { ok: true; data: T; mode: AdapterMode } | ({ ok: false } & CoreError);
