import * as z from "zod";

export const StandingsEntrySchema = z.strictObject({
  userKey: z.string().min(1),
  participantName: z.string().min(1),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  ties: z.number().int().nonnegative(),
  totalPoints: z.number().finite(),
  highScore: z.number().finite(),
  averageScore: z.number().finite(),
  streak: z.string().regex(/^(?:0|[1-9]\d*[WLT])$/),
});

export const StandingsResponseSchema = z.strictObject({
  season: z.string().min(1),
  lastUpdated: z.iso.datetime(),
  standings: z.array(StandingsEntrySchema),
});

export const ContestSummarySchema = z.strictObject({
  contestKey: z.string().min(1),
  name: z.string().min(1),
  fetchedAt: z.iso.datetime(),
  participantCount: z.number().int().nonnegative(),
});

export const ContestsResponseSchema = z.strictObject({
  season: z.string().min(1),
  lastUpdated: z.iso.datetime(),
  contests: z.array(ContestSummarySchema),
});

export const UpcomingContestSchema = z.strictObject({
  upcomingContestId: z.string().min(1),
  name: z.string().min(1),
  contestUrl: z.url(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

export const UpcomingContestsResponseSchema = z.strictObject({
  upcomingContests: z.array(UpcomingContestSchema),
});

export const TeamRosterPlayerSchema = z.strictObject({
  position: z.string().min(1),
  playerImage: z.string(),
  playerName: z.string().min(1),
  salary: z.number().int().nonnegative(),
  percentDrafted: z.number().min(0).max(100),
  statsDescription: z.string(),
  fantasyPoints: z.number().finite(),
});

export const TeamContestResultSchema = z.strictObject({
  contestKey: z.string().min(1),
  name: z.string().min(1),
  fetchedAt: z.iso.datetime(),
  fantasyPoints: z.number().finite(),
  place: z.number().int().positive(),
  outcome: z.enum(["WIN", "LOSS", "TIE"]),
  resultSource: z.enum(["draftkings", "missing_default"]),
  isOverridden: z.boolean(),
  roster: z.array(TeamRosterPlayerSchema),
});

export const TeamDetailsSchema = StandingsEntrySchema.extend({
  standingPlace: z.number().int().positive(),
  winPercentage: z.number().min(0).max(100),
  firstPlaceContests: z.number().int().nonnegative(),
  contests: z.array(TeamContestResultSchema),
});

export const TeamDetailsResponseSchema = z.strictObject({
  season: z.string().min(1),
  lastUpdated: z.iso.datetime(),
  team: TeamDetailsSchema,
});

export const ContestDetailResultSchema = z.strictObject({
  userKey: z.string().min(1),
  participantName: z.string().min(1),
  place: z.number().int().positive(),
  fantasyPoints: z.number().finite(),
  outcome: z.enum(["WIN", "LOSS", "TIE"]),
  resultSource: z.enum(["draftkings", "missing_default"]),
  isOverridden: z.boolean(),
  roster: z.array(TeamRosterPlayerSchema),
});

export const ContestDetailsSchema = z.strictObject({
  contestKey: z.string().min(1),
  name: z.string().min(1),
  fetchedAt: z.iso.datetime(),
  results: z.array(ContestDetailResultSchema),
});

export const ContestDetailsResponseSchema = z.strictObject({
  season: z.string().min(1),
  lastUpdated: z.iso.datetime(),
  contest: ContestDetailsSchema,
});

export type StandingsEntry = z.infer<typeof StandingsEntrySchema>;
export type StandingsResponse = z.infer<typeof StandingsResponseSchema>;
export type ContestSummary = z.infer<typeof ContestSummarySchema>;
export type ContestsResponse = z.infer<typeof ContestsResponseSchema>;
export type UpcomingContest = z.infer<typeof UpcomingContestSchema>;
export type UpcomingContestsResponse = z.infer<typeof UpcomingContestsResponseSchema>;
export type TeamRosterPlayer = z.infer<typeof TeamRosterPlayerSchema>;
export type TeamContestResult = z.infer<typeof TeamContestResultSchema>;
export type TeamDetails = z.infer<typeof TeamDetailsSchema>;
export type TeamDetailsResponse = z.infer<typeof TeamDetailsResponseSchema>;
export type ContestDetailResult = z.infer<typeof ContestDetailResultSchema>;
export type ContestDetails = z.infer<typeof ContestDetailsSchema>;
export type ContestDetailsResponse = z.infer<typeof ContestDetailsResponseSchema>;
