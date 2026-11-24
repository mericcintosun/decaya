"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BandBars } from "@/components/band-bars";
import { ClapCapture } from "@/components/clap-capture";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { midRt60, type Measurement } from "@/lib/acoustics";
import { FIELD_LIMITS, measurementNote, ROOM_TYPES, ROOM_USES, slugify } from "@/lib/data";
import { HINTS } from "@/lib/errors";
import { storedRoomSchema } from "@/lib/schemas";
import { saveRoom } from "@/lib/store";
import type { AdapterMode, Room, RoomType, RoomUse } from "@/lib/types";

let draftCounter = 0;

/** A short id made once per measurement. Falls back to a counter where randomUUID is missing. */
function newDraftId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID().replace(/-/g, "").slice(0, 4);
  draftCounter += 1;
  return `d${draftCounter.toString(36)}${Math.floor(performance.now()).toString(36).slice(-3)}`;
}

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
  const [saving, setSaving] = useState(false);
  // One id per measurement: a double click or a retry builds the same slug, and
  // saveRoom (lib/store.ts) upserts by slug, so only one room is ever stored.
  const draftId = useRef<string | null>(null);

  function onResult(next: Measurement) {
    draftId.current = newDraftId();
    setM(next);
    setError(null);
  }

  function save() {
    if (saving) return;
    const cleanName = name.trim().slice(0, FIELD_LIMITS.name);
    if (!cleanName) return setError("Give the room a name so you can find it later.");
    if (!m || !draftId.current) return setError("Measure the room first: three claps.");
    setSaving(true);
    const room: Room = {
      slug: `${slugify(cleanName) || "room"}-${draftId.current}`,
      name: cleanName,
      owner: owner.trim().slice(0, FIELD_LIMITS.owner) || "You",
      city: city.trim().slice(0, FIELD_LIMITS.city) || "Unlisted",
      type,
      use,
      dims,
      measured: m.bands,
      claps: { valid: m.validCount, total: m.claps.length },
      dynamicRangeDb: Math.round(m.dynamicRangeDb),
      measuredOn: new Date().toISOString().slice(0, 10),
      // From the measurement itself, never from the page mode.
      notes: measurementNote(m),
      source: "local",
    };
    const checked = storedRoomSchema.safeParse(room);
    if (!checked.success) {
      setSaving(false);
      return setError(`${HINTS.invalid_input} Check the room size: each side between 0.5 and 50 m.`);
    }
    const result = saveRoom(checked.data);
    if (!result.ok) {
      setSaving(false);
      return setError(result.hint);
    }
    // saving stays true: the page is leaving, so the button stays disabled.
    router.push(`/rooms/${result.room.slug}`);
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
            <Input
              value={name}
              maxLength={FIELD_LIMITS.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Founders Hall 3F double"
              className="mt-1"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Your first name
              <Input
                value={owner}
                maxLength={FIELD_LIMITS.owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Ilse"
                className="mt-1"
              />
            </label>
            <label className="block text-sm font-semibold">
              City
              <Input
                value={city}
                maxLength={FIELD_LIMITS.city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Mateo, CA"
                className="mt-1"
              />
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
            <ClapCapture mode={mode} onResult={onResult} />
            {m ? (
              <div>
                <p className="mb-3 font-display text-2xl">{midRt60(m.bands).toFixed(2)} s mid-band decay</p>
                <BandBars measured={m.bands} />
              </div>
            ) : (
              <EmptyState
                stamp="No reading yet"
                title="Clap three times to fill this in."
                body="The mid-band decay and the five band bars appear here once the claps are analyzed. Nothing is saved until you press save."
                ctaHref="/about"
                ctaLabel="How the measurement works"
              />
            )}
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={save} disabled={!m || saving}>
            {saving ? "Saving..." : "Save to the fieldbook"}
          </Button>
          {error && <p className="text-sm text-bad">{error}</p>}
          {!m && !error && <p className="text-sm text-muted-foreground">You can save once the room is measured.</p>}
        </div>
      </div>
    </div>
  );
}
