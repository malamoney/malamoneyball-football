import type { ContestLeaderboard } from "../schemas.js";
import type { DatabaseClient } from "./client.js";

export interface ImportContestOptions {
  leagueId: string;
  leagueName: string;
  expectedParticipantCount: number;
  fetchedAt?: Date;
}

export interface ImportContestSummary {
  contestKey: string;
  draftKingsEntries: number;
  missingEntries: number;
}

export interface LeagueMember {
  user_key: string;
  current_user_name: string;
}

interface ReturnedParticipant {
  userKey: string;
}

interface ContestEntryId {
  contest_entry_id: number;
}

function points(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function findMissingLeagueMembers(
  members: readonly LeagueMember[],
  returnedParticipants: readonly ReturnedParticipant[],
  expectedParticipantCount?: number,
): LeagueMember[] {
  if (members.length === 0) {
    throw new Error(
      "The league has no active participants. Add the complete league " +
        "membership before importing a contest.",
    );
  }
  if (
    expectedParticipantCount !== undefined &&
    members.length !== expectedParticipantCount
  ) {
    throw new Error(
      "The league has " + members.length + " active participants, but " +
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
          ", but that participant is not an active league member.",
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
      INSERT INTO public.leagues (
        league_id,
        name,
        expected_participant_count
      )
      VALUES (
        ${options.leagueId},
        ${options.leagueName},
        ${options.expectedParticipantCount}
      )
      ON CONFLICT (league_id) DO UPDATE
      SET
        name = EXCLUDED.name,
        expected_participant_count = EXCLUDED.expected_participant_count
    `;

    const members = await transaction<LeagueMember[]>`
      SELECT p.user_key, p.current_user_name
      FROM public.league_participants lp
      JOIN public.participants p ON p.user_key = lp.user_key
      WHERE lp.league_id = ${options.leagueId}
        AND lp.active = true
      ORDER BY p.user_key
    `;
    const missingMembers = findMissingLeagueMembers(
      members,
      result.leaderboard,
      options.expectedParticipantCount,
    );

    await transaction`
      INSERT INTO public.contests (
        contest_key,
        league_id,
        name,
        draft_group_id,
        fetched_at
      )
      VALUES (
        ${result.contestKey},
        ${options.leagueId},
        ${result.name},
        ${result.draftGroupId},
        ${fetchedAt}
      )
      ON CONFLICT (contest_key) DO UPDATE
      SET
        league_id = EXCLUDED.league_id,
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
      draftKingsEntries: result.leaderboard.length,
      missingEntries: missingMembers.length,
    };
  });
}
