import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveSeasonName,
  getLatestContestLeaderboard,
} from "../src/draftkings.js";

test("derives the season from a trailing week number", () => {
  assert.equal(
    deriveSeasonName("malamoneyball 2026 week 1"),
    "malamoneyball 2026",
  );
  assert.equal(
    deriveSeasonName("malamoneyball 2026 week 17"),
    "malamoneyball 2026",
  );
});

test("leaves a contest name without a trailing week unchanged", () => {
  assert.equal(deriveSeasonName("malamoneyball 2026 playoffs"), "malamoneyball 2026 playoffs");
});

test("returns the latest contest metadata and its leaderboard", async () => {
  const requests: Array<{ url: string; cookie: string | null }> = [];
  const responses: unknown[] = [
    {
      contests: [
        {
          contestKey: "195471290",
          name: "malamoneyball 2026 week 1",
          draftGroupId: 151307,
        },
      ],
    },
    {
      leaderBoard: [
        {
          contestKey: "195471290",
          entryKey: "5253217266",
          lineupId: 5687315610,
          userName: "Dbmiller77",
          userKey: "6842145",
          rank: 1,
          fantasyPoints: 167.1,
          scoringPrecision: 2,
        },
      ],
    },
    {
      draftables: [
        {
          draftableId: 12345678,
          salary: 8200,
          playerImage160: "https://example.test/josh-allen.png",
        },
      ],
    },
    {
      entries: [
        {
          roster: {
            scorecards: [
              {
                displayName: "Josh Allen",
                draftableId: 12345678,
                rosterPosition: "QB",
                percentDrafted: 18.4,
                statsDescription: "Passing and rushing stats",
                stats: [
                  { fantasyPoints: 12.5 },
                  { fantasyPoints: 7.25 },
                ],
              },
            ],
          },
        },
      ],
    },
  ];

  const fetchMock: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    requests.push({
      url: String(input),
      cookie: headers.get("cookie"),
    });

    return Response.json(responses.shift());
  };

  const result = await getLatestContestLeaderboard({
    cookie: "jwe=test; iv=test;",
    baseUrl: "https://example.test",
    fetch: fetchMock,
  });

  assert.deepEqual(result, {
    contestKey: "195471290",
    name: "malamoneyball 2026 week 1",
    season: "malamoneyball 2026",
    draftGroupId: 151307,
    leaderboard: [
      {
        entryKey: "5253217266",
        lineupId: 5687315610,
        userName: "Dbmiller77",
        userKey: "6842145",
        rank: 1,
        fantasyPoints: 167.1,
        roster: [
          {
            name: "Josh Allen",
            draftableId: 12345678,
            position: "QB",
            percentDrafted: 18.4,
            statsDescription: "Passing and rushing stats",
            fantasyPoints: 19.75,
            playerImage: "https://example.test/josh-allen.png",
            salary: 8200,
          },
        ],
      },
    ],
  });
  assert.deepEqual(requests, [
    {
      url:
        "https://example.test/contests/v1/contestsets/league/uyqc2yy8/historical?limit=1&offset=0&format=json",
      cookie: "jwe=test; iv=test;",
    },
    {
      url:
        "https://example.test/scores/v1/leaderboards/195471290?format=json&embed=leaderboard",
      cookie: "jwe=test; iv=test;",
    },
    {
      url:
        "https://example.test/draftgroups/v1/draftgroups/151307/draftables",
      cookie: "jwe=test; iv=test;",
    },
    {
      url:
        "https://example.test/scores/v2/entries/151307/5253217266?format=json&embed=roster",
      cookie: "jwe=test; iv=test;",
    },
  ]);
});

test("fails clearly when the contests array is empty", async () => {
  const fetchMock: typeof fetch = async () => Response.json({ contests: [] });

  await assert.rejects(
    getLatestContestLeaderboard({
      cookie: "jwe=test; iv=test;",
      fetch: fetchMock,
    }),
    /contests: No historical contest was returned/,
  );
});

test("fails clearly when the latest contest has no name", async () => {
  const fetchMock: typeof fetch = async () =>
    Response.json({
      contests: [{ contestKey: "195471290", draftGroupId: 151307 }],
    });

  await assert.rejects(
    getLatestContestLeaderboard({
      cookie: "jwe=test; iv=test;",
      fetch: fetchMock,
    }),
    /contests\.0\.name: Invalid input: expected string/,
  );
});

test("fails clearly when the latest contest has no draftGroupId", async () => {
  const fetchMock: typeof fetch = async () =>
    Response.json({
      contests: [
        {
          contestKey: "195471290",
          name: "malamoneyball 2026 week 1",
        },
      ],
    });

  await assert.rejects(
    getLatestContestLeaderboard({
      cookie: "jwe=test; iv=test;",
      fetch: fetchMock,
    }),
    /contests\.0\.draftGroupId: Invalid input: expected number/,
  );
});

test("includes the HTTP status when DraftKings rejects the request", async () => {
  const fetchMock: typeof fetch = async () =>
    new Response("Unauthorized", {
      status: 401,
      statusText: "Unauthorized",
    });

  await assert.rejects(
    getLatestContestLeaderboard({
      cookie: "expired",
      fetch: fetchMock,
    }),
    /401 Unauthorized.*Unauthorized/,
  );
});
