import assert from "node:assert/strict";
import test from "node:test";

import {
  findMissingLeagueMembers,
  type LeagueMember,
} from "../src/database/import-contest.js";

const members: LeagueMember[] = [
  { user_key: "user-1", current_user_name: "One" },
  { user_key: "user-2", current_user_name: "Two" },
  { user_key: "user-3", current_user_name: "Three" },
];

test("identifies configured participants missing from DraftKings", () => {
  assert.deepEqual(
    findMissingLeagueMembers(members, [
      { userKey: "user-1" },
      { userKey: "user-3" },
    ]),
    [{ user_key: "user-2", current_user_name: "Two" }],
  );
});

test("rejects a DraftKings participant outside configured membership", () => {
  assert.throws(
    () => findMissingLeagueMembers(members, [{ userKey: "unexpected" }]),
    /not an active league member/,
  );
});

test("rejects duplicate contest results for a participant", () => {
  assert.throws(
    () =>
      findMissingLeagueMembers(members, [
        { userKey: "user-1" },
        { userKey: "user-1" },
      ]),
    /more than once/,
  );
});

test("refuses imports before league membership is configured", () => {
  assert.throws(
    () => findMissingLeagueMembers([], []),
    /complete league membership/,
  );
});

test("refuses imports until the expected membership count is configured", () => {
  assert.throws(
    () => findMissingLeagueMembers(members, [], 14),
    /3 active participants, but 14 are required/,
  );
});
