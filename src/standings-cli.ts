import { requireSeasonYear } from "./cli-args.js";
import { withDatabase } from "./database/client.js";
import { getSeasonStandings } from "./database/standings.js";

const DEFAULT_LEAGUE_ID = "uyqc2yy8";

async function main(): Promise<void> {
  const leagueId = process.env.DK_LEAGUE_ID ?? DEFAULT_LEAGUE_ID;
  const seasonYear = requireSeasonYear();
  const standings = await withDatabase((sql) =>
    getSeasonStandings(sql, leagueId, seasonYear)
  );
  process.stdout.write(JSON.stringify(standings, null, 2) + "\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Unable to fetch standings: " + message);
  process.exitCode = 1;
});
