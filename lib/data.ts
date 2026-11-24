import { bestFix, midRt60, predictRt60, type BandValues, type Furnishing, type RoomDims } from "@/lib/acoustics";

export type RoomType = "dorm" | "bedroom" | "studio" | "bathroom" | "study" | "garage" | "closet" | "living";
export type RoomUse = "podcast" | "vocals" | "lectures" | "streaming";

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "dorm", label: "Dorm room" },
  { value: "bedroom", label: "Bedroom" },
  { value: "studio", label: "Studio apartment" },
  { value: "living", label: "Living room" },
  { value: "study", label: "Study room" },
  { value: "bathroom", label: "Bathroom" },
  { value: "garage", label: "Garage" },
  { value: "closet", label: "Closet" },
];

export const ROOM_USES: { value: RoomUse; label: string }[] = [
  { value: "podcast", label: "Podcast" },
  { value: "vocals", label: "Vocals and covers" },
  { value: "lectures", label: "Online classes" },
  { value: "streaming", label: "Streaming" },
];

export interface Room {
  slug: string;
  name: string;
  owner: string;
  city: string;
  type: RoomType;
  use: RoomUse;
  dims: RoomDims;
  /** Measured RT60 in seconds at 250, 500, 1k, 2k, 4k Hz. */
  measured: BandValues;
  claps: { valid: number; total: number };
  /** How far the clap peak stood above the noise floor. */
  dynamicRangeDb: number;
  measuredOn: string;
  notes: string;
  source: "fieldbook" | "local";
}

// Absorption coefficients adapted from published tables (Beranek, Everest's Master
// Handbook of Acoustics). Duvet and bean bag values are our estimates from fibrous
// blanket data and are labelled as such in /about.
export const furnishings: Furnishing[] = [
  {
    id: "heavy-curtain",
    name: "Thick curtain",
    detail: "Floor to ceiling across the window wall, 2.0 x 2.5 m, gathered",
    areaM2: 5,
    covers: true,
    alpha: [0.35, 0.55, 0.72, 0.7, 0.65],
    costUsd: 34,
    source: "Heavy velour draped to half area, Beranek",
  },
  {
    id: "duvet-wall",
    name: "Duvet on the wall",
    detail: "A queen duvet hung from two hooks, 2.0 x 2.0 m, a hand's width off the wall",
    areaM2: 4,
    covers: true,
    alpha: [0.35, 0.62, 0.75, 0.75, 0.72],
    costUsd: 0,
    source: "Estimate from 50 mm fibrous blanket with air gap",
  },
  {
    id: "area-rug",
    name: "Wool rug",
    detail: "2 x 3 m rug with a felt pad on a hard floor",
    areaM2: 6,
    covers: true,
    alpha: [0.1, 0.3, 0.5, 0.62, 0.68],
    costUsd: 45,
    source: "Heavy carpet on pad, Everest",
  },
  {
    id: "bookshelf",
    name: "Full bookshelf",
    detail: "Packed shelf against a bare wall, 1.0 x 2.0 m face",
    areaM2: 2,
    covers: true,
    alpha: [0.3, 0.38, 0.4, 0.38, 0.35],
    costUsd: 0,
    source: "Mixed-depth books, scattering plus absorption, estimate",
  },
  {
    id: "foam-panels",
    name: "Foam panels",
    detail: "12-pack of 30 x 30 cm wedge foam, 5 cm deep (1.08 square meters total)",
    areaM2: 1.08,
    covers: true,
    alpha: [0.25, 0.65, 0.9, 0.95, 0.97],
    costUsd: 79,
    source: "5 cm acoustic foam, manufacturer data",
  },
  {
    id: "bean-bag",
    name: "Bean bag",
    detail: "Fabric bean bag or upholstered chair, free-standing",
    areaM2: 1.5,
    covers: false,
    alpha: [0.45, 0.6, 0.65, 0.65, 0.6],
    costUsd: 25,
    source: "Upholstered seat per unit, estimate",
  },
];

export const rooms: Room[] = [
  {
    slug: "founders-hall-3f-double",
    name: "Founders Hall 3F double",
    owner: "Ilse M.",
    city: "San Mateo, CA",
    type: "dorm",
    use: "podcast",
    dims: { length: 4.2, width: 3.1, height: 2.6 },
    measured: [0.98, 0.94, 0.92, 0.86, 0.71],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 44,
    measuredOn: "2026-11-14",
    notes: "Bare linoleum floor, two steel bed frames, blinds on the only window. The weekly show sounded like it was taped in a stairwell.",
    source: "fieldbook",
  },
  {
    slug: "oakmont-coop-shared-bathroom",
    name: "Oakmont Co-op shared bathroom",
    owner: "Kenji T.",
    city: "Redwood City, CA",
    type: "bathroom",
    use: "vocals",
    dims: { length: 2.4, width: 1.9, height: 2.5 },
    measured: [1.62, 1.71, 1.58, 1.44, 1.2],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 47,
    measuredOn: "2026-11-15",
    notes: "Tile on four walls. Kenji records harmonies here because it flatters a voice, then wonders why the mix turns to soup.",
    source: "fieldbook",
  },
  {
    slug: "el-camino-studio-apartment",
    name: "El Camino studio apartment",
    owner: "Priya R.",
    city: "Burlingame, CA",
    type: "studio",
    use: "streaming",
    dims: { length: 6.0, width: 4.5, height: 2.7 },
    measured: [0.71, 0.66, 0.62, 0.58, 0.52],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 41,
    measuredOn: "2026-11-16",
    notes: "Hardwood floor, one sofa, a kitchen counter at the far end. Chat says the stream sounds hollow.",
    source: "fieldbook",
  },
  {
    slug: "half-moon-bay-childhood-bedroom",
    name: "Childhood bedroom, Half Moon Bay",
    owner: "Mateo G.",
    city: "Half Moon Bay, CA",
    type: "bedroom",
    use: "vocals",
    dims: { length: 3.6, width: 3.3, height: 2.4 },
    measured: [0.52, 0.47, 0.44, 0.42, 0.39],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 39,
    measuredOn: "2026-11-16",
    notes: "Wall-to-wall carpet, a loaded closet with the door open, a double bed. Already in range: leave it alone.",
    source: "fieldbook",
  },
  {
    slug: "library-study-room-b12",
    name: "Library study room B12",
    owner: "Dana K.",
    city: "San Mateo, CA",
    type: "study",
    use: "lectures",
    dims: { length: 3.8, width: 3.0, height: 2.7 },
    measured: [0.81, 0.76, 0.7, 0.66, 0.6],
    claps: { valid: 2, total: 3 },
    dynamicRangeDb: 36,
    measuredOn: "2026-11-17",
    notes: "Glass wall facing the stacks, whiteboard, a hum from the vent. One clap was lost under the vent noise.",
    source: "fieldbook",
  },
  {
    slug: "redwood-hall-1f-single",
    name: "Redwood Hall 1F single",
    owner: "Theo A.",
    city: "Belmont, CA",
    type: "dorm",
    use: "lectures",
    dims: { length: 3.4, width: 2.7, height: 2.6 },
    measured: [0.88, 0.85, 0.83, 0.77, 0.66],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 43,
    measuredOn: "2026-11-18",
    notes: "Cinder block walls painted white. Section leaders keep asking Theo to move closer to the mic.",
    source: "fieldbook",
  },
  {
    slug: "sofia-garage-band-corner",
    name: "Garage band corner",
    owner: "Sofia L.",
    city: "San Carlos, CA",
    type: "garage",
    use: "vocals",
    dims: { length: 5.8, width: 3.0, height: 2.4 },
    measured: [1.21, 1.12, 1.04, 0.97, 0.86],
    claps: { valid: 2, total: 3 },
    dynamicRangeDb: 34,
    measuredOn: "2026-11-18",
    notes: "Concrete slab, roll-up door, a fridge that kicks on every ten minutes. Low confidence: the third clap clipped.",
    source: "fieldbook",
  },
  {
    slug: "walk-in-closet-vocal-booth",
    name: "Walk-in closet vocal booth",
    owner: "Ana P.",
    city: "Millbrae, CA",
    type: "closet",
    use: "vocals",
    dims: { length: 1.8, width: 1.5, height: 2.4 },
    measured: [0.31, 0.24, 0.21, 0.19, 0.18],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 38,
    measuredOn: "2026-11-19",
    notes: "Coats on three sides. So dead that Ana sounds boxed in; adding more soft stuff would make it worse.",
    source: "fieldbook",
  },
  {
    slug: "foster-city-townhouse-living-room",
    name: "Foster City townhouse living room",
    owner: "Jordan W.",
    city: "Foster City, CA",
    type: "living",
    use: "podcast",
    dims: { length: 5.5, width: 4.2, height: 2.7 },
    measured: [0.66, 0.62, 0.57, 0.55, 0.5],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 45,
    measuredOn: "2026-11-20",
    notes: "Sectional sofa, laminate floor, big sliding door. Close to target, one rug away.",
    source: "fieldbook",
  },
  {
    slug: "lantern-house-kitchen-nook",
    name: "Lantern House kitchen nook",
    owner: "Kwame O.",
    city: "San Bruno, CA",
    type: "living",
    use: "streaming",
    dims: { length: 3.9, width: 3.2, height: 2.6 },
    measured: [1.05, 0.99, 0.95, 0.9, 0.78],
    claps: { valid: 3, total: 3 },
    dynamicRangeDb: 40,
    measuredOn: "2026-11-21",
    notes: "Tile floor, cabinets, a dining table. The only room in the house with a door that locks during streams.",
    source: "fieldbook",
  },
];

export function getRoom(slug: string): Room | undefined {
  return rooms.find((r) => r.slug === slug);
}

export function fixFor(room: Pick<Room, "measured" | "dims">) {
  return bestFix(room.measured, room.dims, furnishings);
}

/** Average mid-band reduction one item brings across rooms that are too live. */
export function averageCut(itemId: string, pool: Room[] = rooms): number {
  const item = furnishings.find((f) => f.id === itemId);
  const live = pool.filter((r) => midRt60(r.measured) > 0.5);
  if (!item || live.length === 0) return 0;
  const cuts = live.map((r) => 1 - midRt60(predictRt60(r.measured, r.dims, [item])) / midRt60(r.measured));
  return cuts.reduce((s, c) => s + c, 0) / cuts.length;
}

/* ---------- Rooms measured in this browser (no server: localStorage) ---------- */

const STORAGE_KEY = "decaya.rooms.v1";

// TODO: swap this localStorage adapter for a shared store (for example Vercel KV)
// if rooms should be visible across devices. Same two functions, same Room shape.
export function loadLocalRooms(): Room[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Room[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalRoom(room: Room): void {
  const others = loadLocalRooms().filter((r) => r.slug !== room.slug);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([room, ...others]));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
