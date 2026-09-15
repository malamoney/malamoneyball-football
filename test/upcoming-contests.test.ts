import assert from "node:assert/strict";
import test from "node:test";

import { parseUpcomingContestInput } from "../src/database/upcoming-contests.js";
import { UpcomingContestsResponseSchema } from "../src/web-schemas.js";

const baseInput = {
  leagueId: "uyqc2yy8",
  seasonName: "malamoneyball 2026",
  contestName: "malamoneyball 2026 week 2",
};

test("validates and normalizes an upcoming DraftKings contest", () => {
  assert.deepEqual(
    parseUpcomingContestInput({
      ...baseInput,
      contestUrl: " https://www.draftkings.com/draft/contest/123 ",
    }),
    {
      ...baseInput,
      contestUrl: "https://www.draftkings.com/draft/contest/123",
    },
  );
});

test("rejects non-DraftKings and insecure contest URLs", () => {
  assert.throws(
    () => parseUpcomingContestInput({ ...baseInput, contestUrl: "https://example.com" }),
    /DraftKings URL/,
  );
  assert.throws(
    () =>
      parseUpcomingContestInput({
        ...baseInput,
        contestUrl: "http://www.draftkings.com/draft/contest/123",
      }),
    /DraftKings URL/,
  );
});

test("validates upcoming contest API data", () => {
  const response = {
    upcomingContests: [
      {
        upcomingContestId: "1",
        name: baseInput.contestName,
        contestUrl: "https://www.draftkings.com/draft/contest/123",
        createdAt: "2026-09-15T03:00:00.000Z",
        expiresAt: "2026-09-20T17:00:00.000Z",
      },
    ],
  };

  assert.deepEqual(UpcomingContestsResponseSchema.parse(response), response);
});
