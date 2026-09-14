import type { DatabaseClient } from "./client.js";

interface StandingsRow {
  user_key: string;
  participant_name: string;
  wins: number;
  losses: number;
  ties: number;
  total_points: string;
}

export interface StandingsEntry {
  userKey: string;
  participantName: string;
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
}

export async function getLeagueStandings(
  sql: DatabaseClient,
  leagueId: string,
): Promise<StandingsEntry[]> {
  const rows = await sql<StandingsRow[]>`
    SELECT
      user_key,
      participant_name,
      wins,
      losses,
      ties,
      total_points
    FROM public.league_standings
    WHERE league_id = ${leagueId}
    ORDER BY
      wins DESC,
      ties DESC,
      total_points DESC,
      participant_name
  `;

  return rows.map((row) => ({
    userKey: row.user_key,
    participantName: row.participant_name,
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    totalPoints: Number(row.total_points),
  }));
}
