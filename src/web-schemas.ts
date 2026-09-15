import * as z from "zod";

export const StandingsEntrySchema = z.strictObject({
  userKey: z.string().min(1),
  participantName: z.string().min(1),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  ties: z.number().int().nonnegative(),
  totalPoints: z.number().finite(),
});

export const StandingsResponseSchema = z.strictObject({
  season: z.string().min(1),
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
  contests: z.array(ContestSummarySchema),
});

export type StandingsEntry = z.infer<typeof StandingsEntrySchema>;
export type StandingsResponse = z.infer<typeof StandingsResponseSchema>;
export type ContestSummary = z.infer<typeof ContestSummarySchema>;
export type ContestsResponse = z.infer<typeof ContestsResponseSchema>;
