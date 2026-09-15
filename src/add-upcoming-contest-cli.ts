import { requireFlag, requireSeasonName } from "./cli-args.js";
import { withDatabase } from "./database/client.js";
import { createUpcomingContest } from "./database/upcoming-contests.js";

const DEFAULT_LEAGUE_ID = "uyqc2yy8";

async function main(): Promise<void> {
  const input = {
    leagueId: process.env.DK_LEAGUE_ID ?? DEFAULT_LEAGUE_ID,
    seasonName: requireSeasonName(),
    contestName: requireFlag("contest-name"),
    contestUrl: requireFlag("contest-url"),
  };
  const contest = await withDatabase((sql) =>
    createUpcomingContest(sql, input)
  );

  console.log(
    `Added upcoming contest "${contest.name}". It expires at ${contest.expiresAt}.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Unable to add upcoming contest: " + message);
  process.exitCode = 1;
});
