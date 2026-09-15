import type { DatabaseClient } from "./client.js";
import type { TeamRosterPlayer } from "./team-details.js";

type ContestOutcome = "WIN" | "LOSS" | "TIE";
type ResultSource = "draftkings" | "missing_default";

interface ContestRow {
  contest_key: string;
  name: string;
  fetched_at: Date;
  contest_start_time: Date | null;
}

interface ContestResultRow {
  user_key: string;
  participant_name: string;
  effective_rank: string;
  fantasy_points: string;
  outcome: ContestOutcome;
  result_source: ResultSource;
  is_overridden: boolean;
}

interface RosterRow {
  user_key: string;
  roster_index: number;
  position: string;
  player_image: string;
  player_name: string;
  salary: number;
  percent_drafted: string;
  stats_description: string;
  fantasy_points: string;
}

export interface ContestDetailResult {
  userKey: string;
  participantName: string;
  place: number;
  fantasyPoints: number;
  outcome: ContestOutcome;
  resultSource: ResultSource;
  isOverridden: boolean;
  roster: TeamRosterPlayer[];
}

export interface ContestDetails {
  contestKey: string;
  name: string;
  fetchedAt: string;
  contestStartTime: string | null;
  results: ContestDetailResult[];
}

export async function getContestDetails(
  sql: DatabaseClient,
  leagueId: string,
  seasonName: string,
  contestKey: string,
): Promise<ContestDetails | null> {
  const contestRows = await sql<ContestRow[]>`
    SELECT c.contest_key, c.name, c.fetched_at, c.contest_start_time
    FROM public.contests c
    JOIN public.seasons s ON s.season_id = c.season_id
    WHERE c.contest_key = ${contestKey}
      AND s.league_id = ${leagueId}
      AND s.name = ${seasonName}
    LIMIT 1
  `;
  const contest = contestRows[0];
  if (!contest) {
    return null;
  }

  const [resultRows, rosterRows] = await Promise.all([
    sql<ContestResultRow[]>`
      SELECT
        o.user_key,
        p.current_user_name AS participant_name,
        o.effective_rank,
        o.fantasy_points,
        o.outcome,
        o.result_source,
        o.is_overridden
      FROM public.contest_entry_outcomes o
      JOIN public.participants p ON p.user_key = o.user_key
      WHERE o.contest_key = ${contestKey}
        AND o.league_id = ${leagueId}
        AND o.season_name = ${seasonName}
      ORDER BY o.split_position
    `,
    sql<RosterRow[]>`
      SELECT
        ce.user_key,
        er.roster_index,
        er.position,
        cp.player_image,
        cp.name AS player_name,
        cp.salary,
        cp.percent_drafted,
        cp.stats_description,
        cp.fantasy_points
      FROM public.contest_entries ce
      JOIN public.entry_rosters er
        ON er.contest_entry_id = ce.contest_entry_id
       AND er.contest_key = ce.contest_key
      JOIN public.contest_players cp
        ON cp.contest_key = er.contest_key
       AND cp.draftable_id = er.draftable_id
      WHERE ce.contest_key = ${contestKey}
      ORDER BY ce.user_key, er.roster_index
    `,
  ]);

  const rostersByUser = new Map<string, TeamRosterPlayer[]>();
  for (const row of rosterRows) {
    const roster = rostersByUser.get(row.user_key) ?? [];
    roster.push({
      position: row.position,
      playerImage: row.player_image,
      playerName: row.player_name,
      salary: row.salary,
      percentDrafted: Number(row.percent_drafted),
      statsDescription: row.stats_description,
      fantasyPoints: Number(row.fantasy_points),
    });
    rostersByUser.set(row.user_key, roster);
  }

  return {
    contestKey: contest.contest_key,
    name: contest.name,
    fetchedAt: contest.fetched_at.toISOString(),
    contestStartTime: contest.contest_start_time?.toISOString() ?? null,
    results: resultRows.map((row) => ({
      userKey: row.user_key,
      participantName: row.participant_name,
      place: Number(row.effective_rank),
      fantasyPoints: Number(row.fantasy_points),
      outcome: row.outcome,
      resultSource: row.result_source,
      isOverridden: row.is_overridden,
      roster: rostersByUser.get(row.user_key) ?? [],
    })),
  };
}
