"use client";

import { useSyncExternalStore } from "react";
import type { CoreError } from "@/lib/errors";
import { readRooms, subscribeRooms, type StoreResult } from "@/lib/store";
import type { Room } from "@/lib/types";

export interface LocalRooms {
  rooms: Room[];
  /** False on the server and during hydration; true once the browser store has been read. */
  ready: boolean;
  failed?: CoreError;
}

// Module-level constant so the server snapshot is the same object on every call.
const SERVER_SNAPSHOT: LocalRooms = { rooms: [], ready: false };

let lastResult: StoreResult | null = null;
let lastView: LocalRooms = SERVER_SNAPSHOT;

/** readRooms() returns a cached object while the stored string is unchanged; reuse the view too. */
function getSnapshot(): LocalRooms {
  const r = readRooms();
  if (r !== lastResult) {
    lastResult = r;
    lastView = { rooms: r.rooms, ready: true, failed: r.failed };
  }
  return lastView;
}

const getServerSnapshot = () => SERVER_SNAPSHOT;

/** The one hook per route that reads rooms measured in this browser. */
export function useLocalRooms(): LocalRooms {
  return useSyncExternalStore(subscribeRooms, getSnapshot, getServerSnapshot);
}
