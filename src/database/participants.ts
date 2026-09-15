import type { DatabaseClient } from "./client.js";

export interface SeasonParticipantInput {
  leagueId: string;
  leagueName: string;
  seasonName: string;
  expectedParticipantCount: number;
  userKey: string;
  userName: string;
}

interface SeasonIdRow {
  season_id: number;
}

export async function addSeasonParticipant(
  sql: DatabaseClient,
  input: SeasonParticipantInput,
): Promise<void> {
  await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO public.leagues (league_id, name)
      VALUES (${input.leagueId}, ${input.leagueName})
      ON CONFLICT (league_id) DO UPDATE
      SET name = EXCLUDED.name
    `;
    const seasonRows = await transaction<SeasonIdRow[]>`
      INSERT INTO public.seasons (
        league_id,
        name,
        expected_participant_count
      )
      VALUES (
        ${input.leagueId},
        ${input.seasonName},
        ${input.expectedParticipantCount}
      )
      ON CONFLICT (league_id, name) DO UPDATE
      SET expected_participant_count = EXCLUDED.expected_participant_count
      RETURNING season_id
    `;
    const seasonId = seasonRows[0]!.season_id;
    await transaction`
      INSERT INTO public.participants (user_key, current_user_name)
      VALUES (${input.userKey}, ${input.userName})
      ON CONFLICT (user_key) DO UPDATE
      SET current_user_name = EXCLUDED.current_user_name
    `;
    await transaction`
      INSERT INTO public.season_participants (season_id, user_key, active)
      VALUES (${seasonId}, ${input.userKey}, true)
      ON CONFLICT (season_id, user_key) DO UPDATE SET active = true
    `;
    await transaction`
      UPDATE public.seasons
      SET updated_at = clock_timestamp()
      WHERE season_id = ${seasonId}
    `;
  });
}
