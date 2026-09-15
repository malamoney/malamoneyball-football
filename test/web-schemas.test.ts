import assert from "node:assert/strict";
import test from "node:test";

import {
  StandingsEntrySchema,
  TeamDetailsResponseSchema,
} from "../src/web-schemas.js";

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

test("validates team details with contest roster data", () => {
  const response = {
    season: "malamoneyball 2026",
    team: {
      ...standingsEntry,
      standingPlace: 1,
      winPercentage: 75,
      firstPlaceContests: 2,
      contests: [
        {
          contestKey: "195471290",
          name: "malamoneyball 2026 week 1",
          fetchedAt: "2026-09-13T21:00:00.000Z",
          fantasyPoints: 167.1,
          place: 1,
          outcome: "WIN",
          resultSource: "draftkings",
          isOverridden: false,
          roster: [
            {
              position: "QB",
              playerImage: "https://example.com/player.png",
              playerName: "Example Player",
              salary: 6500,
              percentDrafted: 12.5,
              statsDescription: "24/35, 285 YDS, 2 TD",
              fantasyPoints: 24.6,
            },
          ],
        },
      ],
    },
  };

  assert.deepEqual(TeamDetailsResponseSchema.parse(response), response);
});

test("accepts a missing entry without a roster", () => {
  const parsed = TeamDetailsResponseSchema.parse({
    season: "malamoneyball 2026",
    team: {
      ...standingsEntry,
      standingPlace: 14,
      winPercentage: 0,
      firstPlaceContests: 0,
      contests: [
        {
          contestKey: "195471290",
          name: "malamoneyball 2026 week 1",
          fetchedAt: "2026-09-13T21:00:00.000Z",
          fantasyPoints: 0,
          place: 14,
          outcome: "LOSS",
          resultSource: "missing_default",
          isOverridden: false,
          roster: [],
        },
      ],
    },
  });

  assert.equal(parsed.team.contests[0]?.roster.length, 0);
});
