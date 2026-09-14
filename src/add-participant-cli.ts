import { requireFlag } from "./cli-args.js";
import { withDatabase } from "./database/client.js";
import { addLeagueParticipant } from "./database/participants.js";

const DEFAULT_LEAGUE_ID = "uyqc2yy8";
const DEFAULT_LEAGUE_NAME = "malamoneyball football";
const DEFAULT_PARTICIPANT_COUNT = 14;

async function main(): Promise<void> {
  const leagueId = process.env.DK_LEAGUE_ID ?? DEFAULT_LEAGUE_ID;
  const leagueName = process.env.LEAGUE_NAME ?? DEFAULT_LEAGUE_NAME;
  const expectedParticipantCount = Number(
    process.env.EXPECTED_PARTICIPANT_COUNT ?? DEFAULT_PARTICIPANT_COUNT,
  );
  if (!Number.isInteger(expectedParticipantCount) || expectedParticipantCount < 2) {
    throw new Error("EXPECTED_PARTICIPANT_COUNT must be an integer of at least 2.");
  }
  const userKey = requireFlag("user-key");
  const userName = requireFlag("user-name");

  await withDatabase((sql) =>
    addLeagueParticipant(sql, {
      leagueId,
      leagueName,
      expectedParticipantCount,
      userKey,
      userName,
    })
  );
  console.log("Added " + userName + " (" + userKey + ") to " + leagueId + ".");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Unable to add league participant: " + message);
  process.exitCode = 1;
});
