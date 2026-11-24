import { ImageResponse } from "next/og";

export const alt = "Decaya: clap once, hear your room fixed before you buy anything";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// IDENTITY.md palette (D6 fieldbook). ImageResponse cannot read CSS variables.
const GROUND = "#f5f2e6";
const SURFACE = "#ebe7d4";
const LINE = "#cfc9b4";
const INK = "#26311f";
const GRASS = "#3d7a3d";

const BARS = [0.98, 0.94, 0.92, 0.86, 0.71];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: GROUND,
          padding: 64,
          gap: 48,
          borderBottom: `12px solid ${LINE}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 92, color: INK, fontWeight: 700 }}>Decaya</div>
          <div style={{ display: "flex", fontSize: 40, color: INK, lineHeight: 1.25, maxWidth: 640 }}>
            Clap once. Decaya measures the echo, picks the rug or curtain that fixes it, and lets you hear the result first.
          </div>
          <div style={{ display: "flex", fontSize: 24, color: GRASS }}>Runs in the browser. No install, no server.</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 18,
            width: 380,
            padding: 32,
            background: SURFACE,
            border: `3px solid ${INK}`,
          }}
        >
          {BARS.map((b, i) => (
            <div key={i} style={{ display: "flex", width: 48, height: Math.round(b * 380), background: GRASS }} />
          ))}
        </div>
      </div>
    ),
    size
  );
}
