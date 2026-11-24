"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

/** Side of the handle in px: the 44 px touch target (h-11 w-11). */
const HANDLE = 44;
/** Step for PageUp and PageDown. */
const BIG_STEP = 0.5;

/**
 * Signature 2 (KIT K1): a draggable handle bound to the room width. It owns no
 * acoustics: it reports a width in meters and the bench feeds that into the same
 * room-size state the number inputs use, so predictRt60 reruns on every move.
 * Keyboard: arrows step 0.1 m, PageUp/PageDown 0.5 m, Home/End jump to the ends.
 * Reduced motion keeps the drag and drops only the spring scale on hover and drag.
 */
export function RoomSizeHandle({
  value,
  onChange,
  min = 2,
  max = 6,
  step = 0.1,
}: {
  value: number;
  onChange: (width: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastSent = useRef(value);
  // Travel of the handle in px (track width minus the handle). 0 until measured in the browser.
  const [travel, setTravel] = useState(0);
  const x = useMotionValue(0);
  const fill = useTransform(x, (v: number) => v + HANDLE / 2);
  const reduced = useReducedMotion();

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => Number((Math.round(clamp(v) / step) * step).toFixed(2));
  const toPx = (v: number) => (travel > 0 ? ((clamp(v) - min) / (max - min)) * travel : 0);
  const shown = clamp(value);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTravel(Math.max(0, el.clientWidth - HANDLE));
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Follow the value when the number inputs or the keyboard change it.
  useEffect(() => {
    lastSent.current = value;
    // toPx depends only on travel, min and max, which are all listed below.
    if (!dragging.current) x.set(toPx(value));
  }, [value, travel, min, max, x]);

  function send(next: number) {
    if (next === lastSent.current) return;
    lastSent.current = next;
    onChange(next);
  }

  function onDrag() {
    if (travel <= 0) return;
    send(snap(min + (x.get() / travel) * (max - min)));
  }

  function onDragEnd() {
    dragging.current = false;
    x.set(toPx(lastSent.current));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = shown + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = shown - step;
    else if (e.key === "PageUp") next = shown + BIG_STEP;
    else if (e.key === "PageDown") next = shown - BIG_STEP;
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    send(snap(next));
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span id={`${id}-label`} className="text-sm font-semibold">
          Drag to change the room width
        </span>
        <span className="text-sm tabular-nums" aria-hidden>
          {shown.toFixed(1)} m wide
        </span>
      </div>
      {/* The track scrolls inside its own box on very narrow screens, never the page. */}
      <div className="overflow-x-auto">
        <div ref={trackRef} className="relative h-11 min-w-[16rem]">
          <div
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 border border-foreground bg-background"
          />
          {travel > 0 && (
            <motion.div aria-hidden className="absolute left-0 top-1/2 h-2 -translate-y-1/2 bg-primary" style={{ width: fill }} />
          )}
          {travel > 0 && (
            <motion.div
              role="slider"
              tabIndex={0}
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-hint`}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={shown}
              aria-valuetext={`${shown.toFixed(1)} meters wide`}
              className="absolute left-0 top-0 flex h-11 w-11 cursor-grab touch-none items-center justify-center border border-foreground bg-deep text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
              style={{ x }}
              drag="x"
              dragConstraints={{ left: 0, right: travel }}
              dragElastic={0}
              dragMomentum={false}
              whileHover={reduced ? undefined : { scale: 1.08 }}
              whileDrag={reduced ? undefined : { scale: 1.12 }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 24 }}
              onDragStart={() => {
                dragging.current = true;
              }}
              onDrag={onDrag}
              onDragEnd={onDragEnd}
              onKeyDown={onKeyDown}
            >
              <MoveHorizontal aria-hidden className="size-4" />
            </motion.div>
          )}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground" aria-hidden>
        <span>{min} m</span>
        <span>{max} m</span>
      </div>
      <p id={`${id}-hint`} className="sr-only">
        Arrow keys change the width by 0.1 meters, Page Up and Page Down by 0.5 meters. The width boxes above do the same.
      </p>
    </div>
  );
}
