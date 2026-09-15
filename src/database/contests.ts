import type { DatabaseClient } from "./client.js";

interface ContestSummaryRow {
  contest_key: string;
  name: string;
  fetched_at: Date;
  participant_count: number;
}

export interface ContestSummary {
  contestKey: string;
  name: string;
  fetchedAt: string;
  participantCount: number;
}

export async function getSeasonContests(
  sql: DatabaseClient,
  leagueId: string,
  seasonName: string,
): Promise<ContestSummary[]> {
  const rows = await sql<ContestSummaryRow[]>`
    SELECT
      c.contest_key,
      c.name,
      c.fetched_at,
      count(ce.contest_entry_id)::INTEGER AS participant_count
    FROM public.contests c
    JOIN public.seasons s ON s.season_id = c.season_id
    LEFT JOIN public.contest_entries ce ON ce.contest_key = c.contest_key
    WHERE s.league_id = ${leagueId}
      AND s.name = ${seasonName}
    GROUP BY c.contest_key, c.name, c.fetched_at
    ORDER BY c.fetched_at DESC, c.contest_key DESC
  `;

  return rows.map((row) => ({
    contestKey: row.contest_key,
    name: row.name,
    fetchedAt: row.fetched_at.toISOString(),
    participantCount: row.participant_count,
  }));
}
