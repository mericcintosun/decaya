"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { BandBars } from "@/components/band-bars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/states";
import { useLocalRooms } from "@/components/use-local-rooms";
import { joinNames, midRt60, VERDICT_LABEL, verdictFor, type Verdict } from "@/lib/acoustics";
import { fixFor, ROOM_TYPES, ROOM_USES } from "@/lib/data";
import { clearRooms } from "@/lib/store";
import type { Furnishing, Room } from "@/lib/types";

const VERDICT_BADGE: Record<Verdict, "ok" | "warn" | "bad"> = {
  "too-live": "bad",
  "a-bit-live": "warn",
  "speech-ready": "ok",
  "over-damped": "warn",
};

const typeLabel = (t: Room["type"]) => ROOM_TYPES.find((x) => x.value === t)?.label ?? t;
const useLabel = (u: Room["use"]) => ROOM_USES.find((x) => x.value === u)?.label ?? u;

/**
 * The fieldbook index. Filter and search live in the URL (?q=, ?type=, ?verdict=).
 * Signature interaction 1: "Quick look" grows the row into an expanded specimen
 * card through a shared layoutId, no cut.
 */
export function RoomExplorer({
  seedRooms,
  furnishings,
  initialQuery,
  initialType,
  initialVerdict,
}: {
  seedRooms: Room[];
  furnishings: Furnishing[];
  initialQuery: string;
  initialType: string;
  initialVerdict: string;
}) {
  // The only reader of rooms measured in this browser on this route.
  const { rooms: localRooms, failed: localFailed } = useLocalRooms();
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState(initialType);
  const [verdict, setVerdict] = useState(initialVerdict);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (verdict) params.set("verdict", verdict);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
  }, [q, type, verdict]);

  const all = useMemo(() => {
    const seedSlugs = new Set(seedRooms.map((r) => r.slug));
    return [...localRooms.filter((r) => !seedSlugs.has(r.slug)), ...seedRooms];
  }, [localRooms, seedRooms]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (type && r.type !== type) return false;
      if (verdict && verdictFor(midRt60(r.measured)) !== verdict) return false;
      if (!needle) return true;
      return [r.name, r.owner, r.city, typeLabel(r.type), useLabel(r.use)].join(" ").toLowerCase().includes(needle);
    });
  }, [all, q, type, verdict]);

  const openRoom = all.find((r) => r.slug === open) ?? null;
  const filtered = Boolean(q || type || verdict);

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="fieldbook-heading" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
          <h2 id="fieldbook-heading" className="text-3xl font-semibold">
            The fieldbook
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {shown.length} of {all.length} rooms
          </p>
        </div>

        {localFailed && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border border-warn bg-background p-3 text-sm" role="status">
            <span className="decaya-stamp text-warn">Not readable</span>
            <span>Your saved rooms could not be read, showing the examples.</span>
            <Button variant="outline" size="sm" onClick={() => clearRooms()}>
              Clear saved rooms
            </Button>
          </div>
        )}

        {localRooms.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <Button variant="outline" size="sm" onClick={() => clearRooms()}>
              Clear rooms measured here
            </Button>
            <span className="text-muted-foreground">
              Removes the {localRooms.length === 1 ? "room" : `${localRooms.length} rooms`} saved in this browser. The examples
              stay. Measure again to bring a room back.
            </span>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem_12rem_auto]">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search rooms, owners, cities"
            aria-label="Search rooms"
          />
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Room type">
            <option value="">Every room type</option>
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Verdict">
            <option value="">Any verdict</option>
            {(Object.keys(VERDICT_LABEL) as Verdict[]).map((v) => (
              <option key={v} value={v}>
                {VERDICT_LABEL[v]}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            disabled={!filtered}
            onClick={() => {
              setQ("");
              setType("");
              setVerdict("");
            }}
          >
            Clear
          </Button>
        </div>

        <LayoutGroup>
          {shown.length === 0 ? (
            <EmptyState
              className="mt-6"
              stamp="No specimen"
              title={filtered ? "No room in the fieldbook matches that." : "The fieldbook is empty."}
              body={
                filtered
                  ? "Clear the filters, or measure the room you are sitting in."
                  : "Measure the room you are sitting in and it becomes the first entry."
              }
              ctaHref="/new"
              ctaLabel="Add a room"
            />
          ) : (
            // No overflow-x-auto wrapper here on purpose: it would clip the layoutId
            // return animation (signature 1). Rows collapse to one column below sm.
            <ol className="mt-6 min-w-0 space-y-3">
              {shown.map((room, idx) => {
                const mid = midRt60(room.measured);
                const v = verdictFor(mid);
                const fix = fixFor(room, furnishings);
                return (
                  <li key={room.slug} className="min-h-[5.5rem]">
                    {open !== room.slug && (
                      <motion.div layoutId={`room-${room.slug}`} transition={{ type: "spring", stiffness: 260, damping: 30 }}>
                        <Card className="decaya-specimen grid items-center gap-4 p-4 pr-10 sm:grid-cols-[4rem_1fr_7rem_9rem_auto]">
                          <span className="font-display text-sm text-muted-foreground">No. {String(idx + 1).padStart(2, "0")}</span>
                          <div className="min-w-0">
                            <Link href={`/rooms/${room.slug}`} className="font-display text-lg font-semibold hover:underline">
                              {room.name}
                            </Link>
                            <p className="truncate text-sm text-muted-foreground">
                              {room.owner}, {room.city} · {typeLabel(room.type)} · {useLabel(room.use)}
                              {room.source === "local" && " · measured in this browser"}
                            </p>
                          </div>
                          <p className="font-display text-2xl tabular-nums">
                            {mid.toFixed(2)} s
                            <span className="block font-sans text-xs text-muted-foreground">mid-band RT60</span>
                          </p>
                          <div className="space-y-1">
                            <Badge variant={VERDICT_BADGE[v]}>{VERDICT_LABEL[v]}</Badge>
                            <p className="text-xs text-muted-foreground">
                              {fix.items.length === 0 ? "Leave it as is" : `Fix: ${joinNames(fix.items)}`}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setOpen(room.slug)}>
                            Quick look
                          </Button>
                        </Card>
                      </motion.div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <AnimatePresence>
            {openRoom && (
              <motion.div
                key="overlay"
                className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(null)}
              >
                <motion.div
                  layoutId={`room-${openRoom.slug}`}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="w-full max-w-2xl"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label={openRoom.name}
                >
                  <QuickLook room={openRoom} furnishings={furnishings} onClose={() => setOpen(null)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </section>
    </MotionConfig>
  );
}

function QuickLook({ room, furnishings, onClose }: { room: Room; furnishings: Furnishing[]; onClose: () => void }) {
  const fix = fixFor(room, furnishings);
  const before = midRt60(room.measured);
  const after = midRt60(fix.predicted);
  const v = verdictFor(before);
  return (
    <Card className="decaya-specimen bg-background p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
        <div>
          <h3 className="font-display text-2xl font-semibold">{room.name}</h3>
          <p className="text-sm text-muted-foreground">
            {room.owner}, {room.city} · {room.dims.length} x {room.dims.width} x {room.dims.height} m · measured{" "}
            {room.measuredOn}
          </p>
        </div>
        <Badge variant="stamp" className={room.claps.valid === room.claps.total ? "text-ok" : "text-bad"}>
          {room.claps.valid} of {room.claps.total} claps valid
        </Badge>
      </div>
      <BandBars className="mt-5" measured={room.measured} predicted={fix.items.length ? fix.predicted : undefined} />
      <p className="mt-4 max-w-[65ch] text-sm leading-6">
        {fix.items.length === 0
          ? v === "over-damped"
            ? `At ${before.toFixed(2)} s this room is already too dead. Adding soft things makes it worse; take a coat or two out.`
            : `At ${before.toFixed(2)} s this room is already in the speech range. Record as it is.`
          : `${VERDICT_LABEL[v]} at ${before.toFixed(2)} s. Cheapest plan: ${joinNames(fix.items)} for $${fix.costUsd}, predicted ${after.toFixed(2)} s${fix.reachesTarget ? "" : ", still above the range, so treat the walls too"}.`}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{room.notes}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/rooms/${room.slug}`}>Open the bench and listen</Link>
        </Button>
        <Button variant="outline" onClick={onClose}>
          Back to the list
        </Button>
      </div>
    </Card>
  );
}
