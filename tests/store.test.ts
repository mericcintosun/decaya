// Checks on lib/store.ts with an in-memory localStorage stand-in. No browser needed.
// Run with `npm test` (node:test through tsx).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readRooms, saveRoom, STORAGE_KEY } from "../lib/store";
import { createMemoryStorage, installStorage, TEST_ROOM } from "./memory-storage";

test("saving the same slug twice leaves one room", () => {
  installStorage(createMemoryStorage());
  const first = saveRoom(TEST_ROOM);
  const second = saveRoom({ ...TEST_ROOM, name: "Test dorm, renamed" });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  const { rooms, skipped, failed } = readRooms();
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].name, "Test dorm, renamed");
  assert.equal(skipped, 0);
  assert.equal(failed, undefined);
});

test("a new slug goes first and an existing slug keeps its place", () => {
  installStorage(createMemoryStorage());
  saveRoom(TEST_ROOM);
  saveRoom({ ...TEST_ROOM, slug: "second-room-cd34" });
  saveRoom({ ...TEST_ROOM, name: "Updated" });
  const { rooms } = readRooms();
  assert.deepEqual(
    rooms.map((r) => r.slug),
    ["second-room-cd34", "test-dorm-ab12"],
  );
  assert.equal(rooms[1].name, "Updated");
});

test("corrupt JSON returns failed and does not throw", () => {
  const storage = createMemoryStorage();
  storage.setItem(STORAGE_KEY, "{not json");
  installStorage(storage);
  const result = readRooms();
  assert.equal(result.rooms.length, 0);
  assert.equal(result.failed?.error, "parse_failure");
});

test("an entry missing measured is skipped and counted", () => {
  const storage = createMemoryStorage();
  const { measured: _drop, ...broken } = TEST_ROOM;
  void _drop;
  storage.setItem(STORAGE_KEY, JSON.stringify([TEST_ROOM, { ...broken, slug: "broken-room-ef56" }]));
  installStorage(storage);
  const result = readRooms();
  assert.equal(result.rooms.length, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.failed, undefined);
});

test("blocked storage reads as failed and saves return a typed error", () => {
  installStorage(createMemoryStorage({ blocked: true }));
  const read = readRooms();
  assert.equal(read.failed?.error, "parse_failure");
  const saved = saveRoom(TEST_ROOM);
  assert.equal(saved.ok, false);
  if (!saved.ok) assert.equal(saved.error, "not_configured");
});

test("an invalid room is refused before it reaches storage", () => {
  installStorage(createMemoryStorage());
  const saved = saveRoom({ ...TEST_ROOM, dims: { length: 0.1, width: 3, height: 2.6 } });
  assert.equal(saved.ok, false);
  if (!saved.ok) assert.equal(saved.error, "invalid_input");
  assert.equal(readRooms().rooms.length, 0);
});
