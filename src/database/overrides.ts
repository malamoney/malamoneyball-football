import type { DatabaseClient } from "./client.js";

interface ContestEntryId {
  contest_entry_id: number;
  season_id: number;
}

interface SeasonId {
  season_id: number;
}

export interface ManualOverrideInput {
  contestKey: string;
  userKey: string;
  fantasyPoints: number;
  reason: string;
}

export async function setManualOverride(
  sql: DatabaseClient,
  input: ManualOverrideInput,
): Promise<void> {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("A non-empty reason is required for a manual override.");
  }
  if (!Number.isFinite(input.fantasyPoints)) {
    throw new Error("Manual fantasy points must be a finite number.");
  }

  const roundedPoints =
    Math.round((input.fantasyPoints + Number.EPSILON) * 100) / 100;
  await sql.begin(async (transaction) => {
    const entryRows = await transaction<ContestEntryId[]>`
      SELECT ce.contest_entry_id, c.season_id
      FROM public.contest_entries ce
      JOIN public.contests c ON c.contest_key = ce.contest_key
      WHERE ce.contest_key = ${input.contestKey}
        AND ce.user_key = ${input.userKey}
      FOR UPDATE
    `;
    const entry = entryRows[0];
    if (!entry) {
      throw new Error(
        "No contest result exists for contest " + input.contestKey +
          " and user " + input.userKey + ".",
      );
    }

    await transaction`
      INSERT INTO public.contest_entry_overrides (
        contest_entry_id,
        fantasy_points,
        reason
      )
      VALUES (
        ${entry.contest_entry_id},
        ${roundedPoints},
        ${reason}
      )
      ON CONFLICT (contest_entry_id) DO UPDATE
      SET
        fantasy_points = EXCLUDED.fantasy_points,
        reason = EXCLUDED.reason
    `;
    await transaction`
      UPDATE public.seasons
      SET updated_at = clock_timestamp()
      WHERE season_id = ${entry.season_id}
    `;
  });
}

export async function clearManualOverride(
  sql: DatabaseClient,
  contestKey: string,
  userKey: string,
): Promise<boolean> {
  return sql.begin(async (transaction) => {
    const deleted = await transaction<SeasonId[]>`
      DELETE FROM public.contest_entry_overrides o
      USING public.contest_entries ce, public.contests c
      WHERE o.contest_entry_id = ce.contest_entry_id
        AND c.contest_key = ce.contest_key
        AND ce.contest_key = ${contestKey}
        AND ce.user_key = ${userKey}
      RETURNING c.season_id
    `;
    const result = deleted[0];
    if (!result) {
      return false;
    }

    await transaction`
      UPDATE public.seasons
      SET updated_at = clock_timestamp()
      WHERE season_id = ${result.season_id}
    `;
    return true;
  });
}
