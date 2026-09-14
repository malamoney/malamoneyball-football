import { getLatestContestLeaderboard } from "./draftkings.js";

async function main(): Promise<void> {
  const cookie = process.env.DK_COOKIE;
  if (!cookie) {
    throw new Error(
      "DK_COOKIE is not set. Provide the full Cookie header, for example: " +
        "DK_COOKIE='jwe=...; iv=...;' npm start",
    );
  }

  const contestLeaderboard = await getLatestContestLeaderboard({
    cookie,
    ...(process.env.DK_LEAGUE_ID
      ? { leagueId: process.env.DK_LEAGUE_ID }
      : {}),
    ...(process.env.DK_API_BASE_URL
      ? { baseUrl: process.env.DK_API_BASE_URL }
      : {}),
  });

  process.stdout.write(`${JSON.stringify(contestLeaderboard, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unable to fetch DraftKings leaderboard: ${message}`);
  process.exitCode = 1;
});
