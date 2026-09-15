import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getTeamDetails } from "@/src/database/team-details";
import { TeamDetailsResponseSchema } from "@/src/web-schemas";

const querySchema = z.object({
  season: z.string().trim().min(1),
});

const paramsSchema = z.object({
  userKey: z.string().trim().min(1),
});

const defaultLeagueId = "uyqc2yy8";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userKey: string }> },
) {
  const [query, params] = await Promise.all([
    Promise.resolve(
      querySchema.safeParse({ season: request.nextUrl.searchParams.get("season") }),
    ),
    context.params.then((value) => paramsSchema.safeParse(value)),
  ]);

  if (!query.success || !params.success) {
    return NextResponse.json(
      { error: "A valid team and season are required." },
      { status: 400 },
    );
  }

  try {
    const leagueId = process.env.DK_LEAGUE_ID ?? defaultLeagueId;
    const team = await withDatabase((sql) =>
      getTeamDetails(sql, leagueId, query.data.season, params.data.userKey)
    );
    if (!team) {
      return NextResponse.json(
        { error: "Team not found for this season." },
        { status: 404 },
      );
    }

    const response = TeamDetailsResponseSchema.parse({
      season: query.data.season,
      team,
    });
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Unable to load team details", error);
    return NextResponse.json(
      { error: "Team details are temporarily unavailable." },
      { status: 500 },
    );
  }
}
