import type { DatabaseClient } from "./client.js";

export interface LeagueParticipantInput {
  leagueId: string;
  leagueName: string;
  expectedParticipantCount: number;
  userKey: string;
  userName: string;
}

export async function addLeagueParticipant(
  sql: DatabaseClient,
  input: LeagueParticipantInput,
): Promise<void> {
  await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO public.leagues (
        league_id,
        name,
        expected_participant_count
      )
      VALUES (
        ${input.leagueId},
        ${input.leagueName},
        ${input.expectedParticipantCount}
      )
      ON CONFLICT (league_id) DO UPDATE
      SET
        name = EXCLUDED.name,
        expected_participant_count = EXCLUDED.expected_participant_count
    `;
    await transaction`
      INSERT INTO public.participants (user_key, current_user_name)
      VALUES (${input.userKey}, ${input.userName})
      ON CONFLICT (user_key) DO UPDATE
      SET current_user_name = EXCLUDED.current_user_name
    `;
    await transaction`
      INSERT INTO public.league_participants (league_id, user_key, active)
      VALUES (${input.leagueId}, ${input.userKey}, true)
      ON CONFLICT (league_id, user_key) DO UPDATE SET active = true
    `;
  });
}
