"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BandBars } from "@/components/band-bars";
import { ClapCapture } from "@/components/clap-capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { midRt60, type Measurement } from "@/lib/acoustics";
import { ROOM_TYPES, ROOM_USES, saveLocalRoom, slugify } from "@/lib/data";
import type { AdapterMode, Room, RoomType, RoomUse } from "@/lib/types";

/** Name the room, clap, save. The room lands at the top of the fieldbook on this device. */
export function NewRoomForm({ mode }: { mode: AdapterMode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState<RoomType>("dorm");
  const [use, setUse] = useState<RoomUse>("podcast");
  const [dims, setDims] = useState({ length: 4, width: 3, height: 2.6 });
  const [m, setM] = useState<Measurement | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!name.trim()) return setError("Give the room a name so you can find it later.");
    if (!m) return setError("Measure the room first: three claps.");
    const room: Room = {
      slug: `${slugify(name) || "room"}-${Date.now().toString(36).slice(-4)}`,
      name: name.trim(),
      owner: owner.trim() || "You",
      city: city.trim() || "Unlisted",
      type,
      use,
      dims,
      measured: m.bands,
      claps: { valid: m.validCount, total: m.claps.length },
      dynamicRangeDb: Math.round(m.dynamicRangeDb),
      measuredOn: new Date().toISOString().slice(0, 10),
      notes:
        mode === "real"
          ? `Measured in this browser with ${m.validCount} usable claps, ${m.confidence} confidence.`
          : "Sample data: these values are a stored example measurement, no microphone was used.",
      source: "local",
    };
    saveLocalRoom(room);
    router.push(`/rooms/${room.slug}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>1. Label the specimen</CardTitle>
          <CardDescription>Size matters: Sabine needs the volume to turn decay time into absorption.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm font-semibold">
            Room name
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Founders Hall 3F double" className="mt-1" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Your first name
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Ilse" className="mt-1" />
            </label>
            <label className="block text-sm font-semibold">
              City
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Mateo, CA" className="mt-1" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Room type
              <Select value={type} onChange={(e) => setType(e.target.value as RoomType)} className="mt-1">
                {ROOM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-semibold">
              You record
              <Select value={use} onChange={(e) => setUse(e.target.value as RoomUse)} className="mt-1">
                {ROOM_USES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <fieldset className="grid grid-cols-3 gap-3">
            <legend className="mb-1 text-sm font-semibold">Length, width, height (m)</legend>
            {(["length", "width", "height"] as const).map((k) => (
              <Input
                key={k}
                type="number"
                step="0.1"
                min="1"
                max="20"
                aria-label={k}
                value={dims[k]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v > 0) setDims((d) => ({ ...d, [k]: v }));
                }}
              />
            ))}
          </fieldset>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>2. Clap three times</CardTitle>
            <CardDescription>
              Phone or laptop on a table, you in the middle of the room, no music playing. The browser asks for the microphone
              once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ClapCapture mode={mode} onResult={setM} />
            {m && (
              <div>
                <p className="mb-3 font-display text-2xl">{midRt60(m.bands).toFixed(2)} s mid-band decay</p>
                <BandBars measured={m.bands} />
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={save} disabled={!m}>
            Save to the fieldbook
          </Button>
          {error && <p className="text-sm text-bad">{error}</p>}
          {!m && !error && <p className="text-sm text-muted-foreground">You can save once the room is measured.</p>}
        </div>
      </div>
    </div>
  );
}
