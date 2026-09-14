import type { DatabaseClient } from "./client.js";

export interface SeasonParticipantInput {
  leagueId: string;
  leagueName: string;
  seasonYear: number;
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
        year,
        name,
        expected_participant_count
      )
      VALUES (
        ${input.leagueId},
        ${input.seasonYear},
        ${input.seasonName},
        ${input.expectedParticipantCount}
      )
      ON CONFLICT (league_id, year) DO UPDATE
      SET expected_participant_count = EXCLUDED.expected_participant_count
      WHERE seasons.name = EXCLUDED.name
      RETURNING season_id
    `;
    if (seasonRows.length === 0) {
      throw new Error(
        "The season name does not match the existing " + input.seasonYear +
          " season.",
      );
    }
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
  });
}
