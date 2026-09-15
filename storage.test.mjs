import assert from "node:assert/strict";
import test from "node:test";
import {
  HERE_ID,
  SEED_COURSES,
  fromParsed,
  snapshot,
  parseSnapshot,
} from "./storage.js";

test("parseSnapshot round-trips courses, tees, and here", () => {
  const state = {
    courses: [
      {
        id: "home",
        name: "Roggendorf",
        club: "Dorf",
        lat: 48.5,
        lon: 15.7,
        golf: false,
      },
      SEED_COURSES[0],
    ],
    activeId: "home",
    tees: { home: { date: "2026-09-15", time: "09:12" } },
    expanded: { home: true },
  };
  const here = {
    id: HERE_ID,
    name: "Hier",
    club: "Aktueller Standort",
    lat: 48.2,
    lon: 16.3,
    golf: false,
  };
  const next = parseSnapshot(JSON.stringify(snapshot(state, here)));
  assert.equal(next.courses.length, 2);
  assert.equal(next.courses[0].name, "Roggendorf");
  assert.equal(next.courses[0].golf, false);
  assert.equal(next.activeId, "home");
  assert.deepEqual(next.tees.home, { date: "2026-09-15", time: "09:12" });
  assert.equal(next.expanded.home, true);
  assert.equal(next.here.name, "Hier");
  assert.equal(next.here.lat, 48.2);
});

test("parseSnapshot rejects junk", () => {
  assert.throws(() => parseSnapshot("{"));
  assert.throws(() => parseSnapshot("{}"));
  assert.throws(() => parseSnapshot(JSON.stringify({ courses: "nope" })));
});

test("fromParsed infers golf flag for seed ids only", () => {
  const state = fromParsed(
    {
      courses: [
        { id: "atzenbrugg", name: "Atzenbrugg", lat: 1, lon: 2 },
        { id: "c_1", name: "Home", lat: 3, lon: 4 },
      ],
      activeId: "c_1",
    },
    null
  );
  assert.equal(state.courses[0].golf, true);
  assert.equal(state.courses[1].golf, false);
  assert.equal(state.activeId, "c_1");
});

test("HERE stays active only when a pin is present", () => {
  const withHere = fromParsed(
    { courses: SEED_COURSES, activeId: HERE_ID },
    { id: HERE_ID, name: "Hier", lat: 48, lon: 16, golf: false }
  );
  assert.equal(withHere.activeId, HERE_ID);
  const without = fromParsed(
    { courses: SEED_COURSES, activeId: HERE_ID },
    null
  );
  assert.equal(without.activeId, SEED_COURSES[0].id);
});
