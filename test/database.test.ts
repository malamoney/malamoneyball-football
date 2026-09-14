import assert from "node:assert/strict";
import test from "node:test";

import { parseSeasonName } from "../src/cli-args.js";
import {
  findMissingSeasonMembers,
  type SeasonMember,
} from "../src/database/import-contest.js";

const members: SeasonMember[] = [
  { user_key: "user-1", current_user_name: "One" },
  { user_key: "user-2", current_user_name: "Two" },
  { user_key: "user-3", current_user_name: "Three" },
];

test("requires and trims a season name", () => {
  assert.equal(parseSeasonName("  malamoneyball 2026  "), "malamoneyball 2026");
  assert.throws(() => parseSeasonName("   "), /Season name is required/);
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
