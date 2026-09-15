import type { DatabaseClient } from "./client.js";

interface StandingsRow {
  user_key: string;
  participant_name: string;
  wins: number;
  losses: number;
  ties: number;
  total_points: string;
  high_score: string;
  average_score: string;
  streak: string;
}

export interface StandingsEntry {
  userKey: string;
  participantName: string;
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
  highScore: number;
  averageScore: number;
  streak: string;
}

export async function getSeasonStandings(
  sql: DatabaseClient,
  leagueId: string,
  seasonName: string,
): Promise<StandingsEntry[]> {
  const rows = await sql<StandingsRow[]>`
    SELECT
      user_key,
      participant_name,
      wins,
      losses,
      ties,
      total_points,
      high_score,
      average_score,
      streak
    FROM public.season_standings
    WHERE league_id = ${leagueId}
      AND season_name = ${seasonName}
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
    highScore: Number(row.high_score),
    averageScore: Number(row.average_score),
    streak: row.streak,
  }));
}
