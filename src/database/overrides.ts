import type { DatabaseClient } from "./client.js";

interface ContestEntryId {
  contest_entry_id: number;
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
      SELECT contest_entry_id
      FROM public.contest_entries
      WHERE contest_key = ${input.contestKey}
        AND user_key = ${input.userKey}
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
  });
}

export async function clearManualOverride(
  sql: DatabaseClient,
  contestKey: string,
  userKey: string,
): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM public.contest_entry_overrides o
    USING public.contest_entries ce
    WHERE o.contest_entry_id = ce.contest_entry_id
      AND ce.contest_key = ${contestKey}
      AND ce.user_key = ${userKey}
    RETURNING o.contest_entry_id
  `;

  return deleted.length > 0;
}
