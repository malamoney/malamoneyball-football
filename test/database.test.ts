import assert from "node:assert/strict";
import test from "node:test";

import { parseSeasonYear } from "../src/cli-args.js";
import {
  findMissingSeasonMembers,
  resolveSeasonName,
  type SeasonMember,
} from "../src/database/import-contest.js";

const members: SeasonMember[] = [
  { user_key: "user-1", current_user_name: "One" },
  { user_key: "user-2", current_user_name: "Two" },
  { user_key: "user-3", current_user_name: "Three" },
];

test("stores the first imported season identifier", () => {
  assert.equal(resolveSeasonName(null, "malamoneyball 2026"), "malamoneyball 2026");
});

test("accepts a matching stored season identifier", () => {
  assert.equal(
    resolveSeasonName("malamoneyball 2026", "malamoneyball 2026"),
    "malamoneyball 2026",
  );
});

test("rejects a conflicting season identifier", () => {
  assert.throws(
    () => resolveSeasonName("malamoneyball 2026", "another 2026"),
    /does not match the stored identifier/,
  );
});

test("rejects a blank season identifier", () => {
  assert.throws(() => resolveSeasonName(null, "   "), /cannot be blank/);
});

test("accepts a valid season year", () => {
  assert.equal(parseSeasonYear("2026"), 2026);
});

test("requires a season year", () => {
  assert.throws(() => parseSeasonYear(undefined), /Season is required/);
});

test("rejects a malformed season year", () => {
  assert.throws(() => parseSeasonYear("26"), /four-digit year/);
  assert.throws(() => parseSeasonYear("2026.5"), /four-digit year/);
});

test("identifies configured participants missing from DraftKings", () => {
  assert.deepEqual(
    findMissingSeasonMembers(members, [
      { userKey: "user-1" },
      { userKey: "user-3" },
    ]),
    [{ user_key: "user-2", current_user_name: "Two" }],
  );
});

test("rejects a DraftKings participant outside configured membership", () => {
  assert.throws(
    () => findMissingSeasonMembers(members, [{ userKey: "unexpected" }]),
    /not an active season member/,
  );
});

test("rejects duplicate contest results for a participant", () => {
  assert.throws(
    () =>
      findMissingSeasonMembers(members, [
        { userKey: "user-1" },
        { userKey: "user-1" },
      ]),
    /more than once/,
  );
});

test("refuses imports before league membership is configured", () => {
  assert.throws(
    () => findMissingSeasonMembers([], []),
    /complete season membership/,
  );
});

test("refuses imports until the expected membership count is configured", () => {
  assert.throws(
    () => findMissingSeasonMembers(members, [], 14),
    /3 active participants, but 14 are required/,
  );
});
