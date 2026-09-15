import * as z from "zod";

const finiteNumber = z.number().refine(Number.isFinite, {
  error: "Expected a finite number",
});

const nonnegativeInteger = z.number().int().nonnegative();
const lineupIdentifier = z.number().int().min(-1);

const dateTimeString = z.string().min(1).refine(
  (value) => !Number.isNaN(Date.parse(value)),
  { error: "Expected a valid date-time string" },
);

export const DraftKingsContestsResponseSchema = z.object({
  contests: z.array(
    z.object({
      contestKey: z.string().min(1),
      name: z.string().min(1),
      draftGroupId: nonnegativeInteger,
      contestStartTime: dateTimeString,
    }),
  ).min(1, "No historical contest was returned"),
});

export const DraftKingsLeaderboardResponseSchema = z.object({
  leaderBoard: z.array(
    z.object({
      entryKey: z.string().min(1),
      lineupId: lineupIdentifier,
      userName: z.string().min(1),
      userKey: z.string().min(1),
      rank: nonnegativeInteger,
      fantasyPoints: finiteNumber,
    }),
  ),
});

export const DraftKingsDraftablesResponseSchema = z.object({
  draftables: z.array(
    z.object({
      draftableId: nonnegativeInteger,
      salary: nonnegativeInteger,
      playerImage160: z.string(),
    }),
  ),
});

const DraftKingsStatSchema = z.object({
  fantasyPoints: finiteNumber,
});

const DraftKingsScorecardSchema = z.object({
  displayName: z.string().min(1),
  draftableId: nonnegativeInteger,
  rosterPosition: z.string().min(1),
  percentDrafted: finiteNumber,
  statsDescription: z.string(),
  stats: z.array(DraftKingsStatSchema),
});

export const DraftKingsRosterResponseSchema = z.object({
  entries: z.array(
    z.object({
      roster: z.object({
        scorecards: z.array(DraftKingsScorecardSchema),
      }),
    }),
  ).min(1, "No roster entry was returned"),
});

export const RosterPlayerSchema = z.strictObject({
  name: z.string(),
  draftableId: nonnegativeInteger,
  position: z.string(),
  percentDrafted: finiteNumber,
  statsDescription: z.string(),
  fantasyPoints: finiteNumber,
  playerImage: z.string(),
  salary: nonnegativeInteger,
});

export const LeaderboardEntrySchema = z.strictObject({
  entryKey: z.string(),
  lineupId: lineupIdentifier,
  userName: z.string(),
  userKey: z.string(),
  rank: nonnegativeInteger,
  fantasyPoints: finiteNumber,
  roster: z.array(RosterPlayerSchema),
});

export const ContestLeaderboardSchema = z.strictObject({
  contestKey: z.string(),
  name: z.string(),
  season: z.string().min(1),
  draftGroupId: nonnegativeInteger,
  contestStartTime: dateTimeString,
  leaderboard: z.array(LeaderboardEntrySchema),
});

export type RosterPlayer = z.infer<typeof RosterPlayerSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type ContestLeaderboard = z.infer<typeof ContestLeaderboardSchema>;

export function parseSchema<T extends z.ZodType>(
  schema: T,
  value: unknown,
  label: string,
): z.output<T> {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  const details = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "response";
    return path + ": " + issue.message;
  }).join("; ");

  throw new Error("Invalid " + label + ": " + details);
}
