import type { DatabaseClient } from "./client.js";
import { getSeasonStandings } from "./standings";

type ContestOutcome = "WIN" | "LOSS" | "TIE";
type ResultSource = "draftkings" | "missing_default";

interface ContestResultRow {
  contest_key: string;
  name: string;
  fetched_at: Date;
  fantasy_points: string;
  effective_rank: string;
  outcome: ContestOutcome;
  result_source: ResultSource;
  is_overridden: boolean;
}

interface RosterRow {
  contest_key: string;
  roster_index: number;
  position: string;
  player_image: string;
  player_name: string;
  salary: number;
  percent_drafted: string;
  fantasy_points: string;
}

export interface TeamRosterPlayer {
  position: string;
  playerImage: string;
  playerName: string;
  salary: number;
  percentDrafted: number;
  fantasyPoints: number;
}

export interface TeamContestResult {
  contestKey: string;
  name: string;
  fetchedAt: string;
  fantasyPoints: number;
  place: number;
  outcome: ContestOutcome;
  resultSource: ResultSource;
  isOverridden: boolean;
  roster: TeamRosterPlayer[];
}

export interface TeamDetails {
  userKey: string;
  participantName: string;
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
  highScore: number;
  averageScore: number;
  streak: string;
  standingPlace: number;
  winPercentage: number;
  firstPlaceContests: number;
  contests: TeamContestResult[];
}

export async function getTeamDetails(
  sql: DatabaseClient,
  leagueId: string,
  seasonName: string,
  userKey: string,
): Promise<TeamDetails | null> {
  const standings = await getSeasonStandings(sql, leagueId, seasonName);
  const standingIndex = standings.findIndex((entry) => entry.userKey === userKey);
  if (standingIndex === -1) {
    return null;
  }

  const standing = standings[standingIndex];
  if (!standing) {
    return null;
  }

  const [contestRows, rosterRows] = await Promise.all([
    sql<ContestResultRow[]>`
      SELECT
        c.contest_key,
        c.name,
        c.fetched_at,
        o.fantasy_points,
        o.effective_rank,
        o.outcome,
        o.result_source,
        o.is_overridden
      FROM public.contest_entry_outcomes o
      JOIN public.contests c ON c.contest_key = o.contest_key
      WHERE o.league_id = ${leagueId}
        AND o.season_name = ${seasonName}
        AND o.user_key = ${userKey}
      ORDER BY c.fetched_at DESC, c.contest_key DESC
    `,
    sql<RosterRow[]>`
      SELECT
        ce.contest_key,
        er.roster_index,
        er.position,
        cp.player_image,
        cp.name AS player_name,
        cp.salary,
        cp.percent_drafted,
        cp.fantasy_points
      FROM public.contest_entries ce
      JOIN public.contests c ON c.contest_key = ce.contest_key
      JOIN public.seasons s ON s.season_id = c.season_id
      JOIN public.entry_rosters er
        ON er.contest_entry_id = ce.contest_entry_id
       AND er.contest_key = ce.contest_key
      JOIN public.contest_players cp
        ON cp.contest_key = er.contest_key
       AND cp.draftable_id = er.draftable_id
      WHERE s.league_id = ${leagueId}
        AND s.name = ${seasonName}
        AND ce.user_key = ${userKey}
      ORDER BY c.fetched_at DESC, c.contest_key DESC, er.roster_index
    `,
  ]);

  const rostersByContest = new Map<string, TeamRosterPlayer[]>();
  for (const row of rosterRows) {
    const roster = rostersByContest.get(row.contest_key) ?? [];
    roster.push({
      position: row.position,
      playerImage: row.player_image,
      playerName: row.player_name,
      salary: row.salary,
      percentDrafted: Number(row.percent_drafted),
      fantasyPoints: Number(row.fantasy_points),
    });
    rostersByContest.set(row.contest_key, roster);
  }

  const contests = contestRows.map((row) => ({
    contestKey: row.contest_key,
    name: row.name,
    fetchedAt: row.fetched_at.toISOString(),
    fantasyPoints: Number(row.fantasy_points),
    place: Number(row.effective_rank),
    outcome: row.outcome,
    resultSource: row.result_source,
    isOverridden: row.is_overridden,
    roster: rostersByContest.get(row.contest_key) ?? [],
  }));
  const completedContests = standing.wins + standing.losses + standing.ties;

  return {
    ...standing,
    standingPlace: standingIndex + 1,
    winPercentage:
      completedContests === 0
        ? 0
        : ((standing.wins + standing.ties / 2) / completedContests) * 100,
    firstPlaceContests: contests.filter((contest) => contest.place === 1).length,
    contests,
  };
}
