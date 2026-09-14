import { withDatabase } from "./database/client.js";
import { importContestResults } from "./database/import-contest.js";
import { getLatestContestLeaderboard } from "./draftkings.js";

const DEFAULT_LEAGUE_ID = "uyqc2yy8";
const DEFAULT_LEAGUE_NAME = "malamoneyball football";
const DEFAULT_PARTICIPANT_COUNT = 14;

async function main(): Promise<void> {
  const cookie = process.env.DK_COOKIE;
  if (!cookie) {
    throw new Error("DK_COOKIE is not set.");
  }

  const leagueId = process.env.DK_LEAGUE_ID ?? DEFAULT_LEAGUE_ID;
  const leagueName = process.env.LEAGUE_NAME ?? DEFAULT_LEAGUE_NAME;
  const expectedParticipantCount = Number(
    process.env.EXPECTED_PARTICIPANT_COUNT ?? DEFAULT_PARTICIPANT_COUNT,
  );
  if (!Number.isInteger(expectedParticipantCount) || expectedParticipantCount < 2) {
    throw new Error("EXPECTED_PARTICIPANT_COUNT must be an integer of at least 2.");
  }
  const result = await getLatestContestLeaderboard({
    cookie,
    leagueId,
    ...(process.env.DK_API_BASE_URL
      ? { baseUrl: process.env.DK_API_BASE_URL }
      : {}),
  });
  const summary = await withDatabase((sql) =>
    importContestResults(sql, result, {
      leagueId,
      leagueName,
      expectedParticipantCount,
    })
  );

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Unable to import contest: " + message);
  process.exitCode = 1;
});
