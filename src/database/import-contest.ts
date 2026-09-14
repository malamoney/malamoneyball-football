import type { ContestLeaderboard } from "../schemas.js";
import type { DatabaseClient } from "./client.js";

export interface ImportContestOptions {
  leagueId: string;
  leagueName: string;
  seasonYear: number;
  expectedParticipantCount: number;
  fetchedAt?: Date;
}

export interface ImportContestSummary {
  contestKey: string;
  seasonYear: number;
  draftKingsEntries: number;
  missingEntries: number;
}

export interface SeasonMember {
  user_key: string;
  current_user_name: string;
}

interface ReturnedParticipant {
  userKey: string;
}

interface ContestEntryId {
  contest_entry_id: number;
}

interface SeasonId {
  season_id: number;
}

interface ContestSeasonId {
  season_id: number;
}

function points(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function findMissingSeasonMembers(
  members: readonly SeasonMember[],
  returnedParticipants: readonly ReturnedParticipant[],
  expectedParticipantCount?: number,
): SeasonMember[] {
  if (members.length === 0) {
    throw new Error(
      "The season has no active participants. Add the complete season " +
        "membership before importing a contest.",
    );
  }
  if (
    expectedParticipantCount !== undefined &&
    members.length !== expectedParticipantCount
  ) {
    throw new Error(
      "The season has " + members.length + " active participants, but " +
        expectedParticipantCount + " are required before importing a contest.",
    );
  }

  const membersByUserKey = new Map(
    members.map((member) => [member.user_key, member]),
  );
  const returnedUserKeys = new Set<string>();
  for (const entry of returnedParticipants) {
    if (!membersByUserKey.has(entry.userKey)) {
      throw new Error(
        "DraftKings returned userKey " + entry.userKey +
          ", but that participant is not an active season member.",
      );
    }
    if (returnedUserKeys.has(entry.userKey)) {
      throw new Error(
        "DraftKings returned userKey " + entry.userKey + " more than once.",
      );
    }
    returnedUserKeys.add(entry.userKey);
  }

  return members.filter((member) => !returnedUserKeys.has(member.user_key));
}

export async function importContestResults(
  sql: DatabaseClient,
  result: ContestLeaderboard,
  options: ImportContestOptions,
): Promise<ImportContestSummary> {
  const fetchedAt = options.fetchedAt ?? new Date();

  return sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO public.leagues (league_id, name)
      VALUES (${options.leagueId}, ${options.leagueName})
      ON CONFLICT (league_id) DO UPDATE
      SET name = EXCLUDED.name
    `;

    const seasonRows = await transaction<SeasonId[]>`
      SELECT season_id
      FROM public.seasons
      WHERE league_id = ${options.leagueId}
        AND year = ${options.seasonYear}
        AND expected_participant_count = ${options.expectedParticipantCount}
    `;
    if (seasonRows.length === 0) {
      throw new Error(
        "The " + options.seasonYear + " season is not configured for league " +
          options.leagueId + " with an expected participant count of " +
          options.expectedParticipantCount + ". Add its participants first.",
      );
    }
    const seasonId = seasonRows[0]!.season_id;

    const members = await transaction<SeasonMember[]>`
      SELECT p.user_key, p.current_user_name
      FROM public.season_participants sp
      JOIN public.participants p ON p.user_key = sp.user_key
      WHERE sp.season_id = ${seasonId}
        AND sp.active = true
      ORDER BY p.user_key
    `;
    const missingMembers = findMissingSeasonMembers(
      members,
      result.leaderboard,
      options.expectedParticipantCount,
    );

    const existingContestRows = await transaction<ContestSeasonId[]>`
      SELECT season_id
      FROM public.contests
      WHERE contest_key = ${result.contestKey}
    `;
    if (
      existingContestRows.length > 0 &&
      existingContestRows[0]!.season_id !== seasonId
    ) {
      throw new Error(
        "Contest " + result.contestKey + " already belongs to a different " +
          "season and cannot be reassigned.",
      );
    }

    await transaction`
      INSERT INTO public.contests (
        contest_key,
        season_id,
        name,
        draft_group_id,
        fetched_at
      )
      VALUES (
        ${result.contestKey},
        ${seasonId},
        ${result.name},
        ${result.draftGroupId},
        ${fetchedAt}
      )
      ON CONFLICT (contest_key) DO UPDATE
      SET
        season_id = EXCLUDED.season_id,
        name = EXCLUDED.name,
        draft_group_id = EXCLUDED.draft_group_id,
        fetched_at = EXCLUDED.fetched_at
    `;

    for (const entry of result.leaderboard) {
      await transaction`
        UPDATE public.participants
        SET current_user_name = ${entry.userName}
        WHERE user_key = ${entry.userKey}
      `;

      const entryRows = await transaction<ContestEntryId[]>`
        INSERT INTO public.contest_entries (
          contest_key,
          user_key,
          entry_key,
          lineup_id,
          draftkings_rank,
          fantasy_points,
          result_source
        )
        VALUES (
          ${result.contestKey},
          ${entry.userKey},
          ${entry.entryKey},
          ${entry.lineupId},
          ${entry.rank},
          ${points(entry.fantasyPoints)},
          'draftkings'
        )
        ON CONFLICT (contest_key, user_key) DO UPDATE
        SET
          entry_key = EXCLUDED.entry_key,
          lineup_id = EXCLUDED.lineup_id,
          draftkings_rank = EXCLUDED.draftkings_rank,
          fantasy_points = EXCLUDED.fantasy_points,
          result_source = EXCLUDED.result_source
        RETURNING contest_entry_id
      `;
      const contestEntryId = entryRows[0]!.contest_entry_id;

      await transaction`
        DELETE FROM public.entry_rosters
        WHERE contest_entry_id = ${contestEntryId}
      `;

      for (const [rosterIndex, player] of entry.roster.entries()) {
        await transaction`
          INSERT INTO public.contest_players (
            contest_key,
            draftable_id,
            name,
            percent_drafted,
            stats_description,
            fantasy_points,
            player_image,
            salary
          )
          VALUES (
            ${result.contestKey},
            ${player.draftableId},
            ${player.name},
            ${points(player.percentDrafted)},
            ${player.statsDescription},
            ${points(player.fantasyPoints)},
            ${player.playerImage},
            ${player.salary}
          )
          ON CONFLICT (contest_key, draftable_id) DO UPDATE
          SET
            name = EXCLUDED.name,
            percent_drafted = EXCLUDED.percent_drafted,
            stats_description = EXCLUDED.stats_description,
            fantasy_points = EXCLUDED.fantasy_points,
            player_image = EXCLUDED.player_image,
            salary = EXCLUDED.salary
        `;

        await transaction`
          INSERT INTO public.entry_rosters (
            contest_entry_id,
            contest_key,
            roster_index,
            draftable_id,
            position
          )
          VALUES (
            ${contestEntryId},
            ${result.contestKey},
            ${rosterIndex},
            ${player.draftableId},
            ${player.position}
          )
        `;
      }
    }

    for (const member of missingMembers) {
      await transaction`
        INSERT INTO public.contest_entries (
          contest_key,
          user_key,
          fantasy_points,
          result_source
        )
        VALUES (
          ${result.contestKey},
          ${member.user_key},
          0,
          'missing_default'
        )
        ON CONFLICT (contest_key, user_key) DO NOTHING
      `;
    }

    await transaction`
      INSERT INTO public.import_runs (
        contest_key,
        fetched_at,
        draftkings_entry_count,
        missing_entry_count,
        raw_payload
      )
      VALUES (
        ${result.contestKey},
        ${fetchedAt},
        ${result.leaderboard.length},
        ${missingMembers.length},
        ${transaction.json(result)}
      )
    `;

    return {
      contestKey: result.contestKey,
      seasonYear: options.seasonYear,
      draftKingsEntries: result.leaderboard.length,
      missingEntries: missingMembers.length,
    };
  });
}
