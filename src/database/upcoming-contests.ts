import * as z from "zod";

import type { DatabaseClient } from "./client.js";

const UpcomingContestInputSchema = z.strictObject({
  leagueId: z.string().trim().min(1),
  seasonName: z.string().trim().min(1),
  contestName: z.string().trim().min(1),
  contestUrl: z.string().trim().url(),
}).superRefine((input, context) => {
  const url = new URL(input.contestUrl);
  const isDraftKingsHost =
    url.hostname === "draftkings.com" || url.hostname.endsWith(".draftkings.com");
  if (url.protocol !== "https:" || !isDraftKingsHost) {
    context.addIssue({
      code: "custom",
      path: ["contestUrl"],
      message: "Contest URL must be an HTTPS DraftKings URL.",
    });
  }
});

interface UpcomingContestRow {
  upcoming_contest_id: string;
  name: string;
  contest_url: string;
  created_at: Date;
  expires_at: Date;
}

interface SeasonIdRow {
  season_id: number;
}

export interface UpcomingContest {
  upcomingContestId: string;
  name: string;
  contestUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface UpcomingContestInput {
  leagueId: string;
  seasonName: string;
  contestName: string;
  contestUrl: string;
}

export function parseUpcomingContestInput(input: UpcomingContestInput) {
  const parsed = UpcomingContestInputSchema.parse(input);
  return {
    ...parsed,
    contestUrl: new URL(parsed.contestUrl).toString(),
  };
}

function mapUpcomingContest(row: UpcomingContestRow): UpcomingContest {
  return {
    upcomingContestId: row.upcoming_contest_id,
    name: row.name,
    contestUrl: row.contest_url,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
  };
}

export async function createUpcomingContest(
  sql: DatabaseClient,
  input: UpcomingContestInput,
): Promise<UpcomingContest> {
  const parsed = parseUpcomingContestInput(input);
  const seasonRows = await sql<SeasonIdRow[]>`
    SELECT season_id
    FROM public.seasons
    WHERE league_id = ${parsed.leagueId}
      AND name = ${parsed.seasonName}
    LIMIT 1
  `;
  const season = seasonRows[0];
  if (!season) {
    throw new Error(
      `Season "${parsed.seasonName}" is not configured for league ${parsed.leagueId}.`,
    );
  }

  const rows = await sql<UpcomingContestRow[]>`
    INSERT INTO public.upcoming_contests (
      season_id,
      name,
      contest_url
    )
    VALUES (
      ${season.season_id},
      ${parsed.contestName},
      ${parsed.contestUrl}
    )
    ON CONFLICT (season_id, contest_url) DO UPDATE
    SET
      name = EXCLUDED.name,
      created_at = now(),
      expires_at = public.next_upcoming_contest_expiration()
    RETURNING upcoming_contest_id, name, contest_url, created_at, expires_at
  `;

  return mapUpcomingContest(rows[0]!);
}

export async function getUpcomingContests(
  sql: DatabaseClient,
  leagueId: string,
  seasonName: string,
): Promise<UpcomingContest[]> {
  const rows = await sql<UpcomingContestRow[]>`
    SELECT
      uc.upcoming_contest_id,
      uc.name,
      uc.contest_url,
      uc.created_at,
      uc.expires_at
    FROM public.upcoming_contests uc
    JOIN public.seasons s ON s.season_id = uc.season_id
    WHERE s.league_id = ${leagueId}
      AND s.name = ${seasonName}
      AND uc.expires_at > now()
    ORDER BY uc.created_at DESC, uc.upcoming_contest_id DESC
  `;

  return rows.map(mapUpcomingContest);
}
