import assert from "node:assert/strict";
import test from "node:test";

import { StandingsEntrySchema } from "../src/web-schemas.js";

const standingsEntry = {
  userKey: "4034388",
  participantName: "malamoney",
  wins: 3,
  losses: 1,
  ties: 0,
  totalPoints: 622.5,
  highScore: 167.1,
  averageScore: 155.63,
  streak: "3W",
};

test("validates the complete standings metrics", () => {
  assert.deepEqual(StandingsEntrySchema.parse(standingsEntry), standingsEntry);
});

test("accepts an empty-season streak", () => {
  assert.equal(
    StandingsEntrySchema.parse({ ...standingsEntry, streak: "0" }).streak,
    "0",
  );
});

test("rejects a malformed standings streak", () => {
  assert.throws(
    () => StandingsEntrySchema.parse({ ...standingsEntry, streak: "W3" }),
    /Invalid string/,
  );
});
