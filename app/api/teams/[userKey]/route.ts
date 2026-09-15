import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getTeamDetails } from "@/src/database/team-details";
import {
  loadSeasonCachedResource,
  seasonCacheHeaders,
} from "@/src/season-cache";
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
    const result = await withDatabase((sql) =>
      loadSeasonCachedResource(
        sql,
        leagueId,
        query.data.season,
        request.headers.get("if-none-match"),
        () => getTeamDetails(sql, leagueId, query.data.season, params.data.userKey),
      )
    );
    if (result.status === "season-not-found") {
      return NextResponse.json({ error: "Season not found." }, { status: 404 });
    }
    const headers = seasonCacheHeaders(result.metadata);
    if (result.status === "not-modified") {
      return new NextResponse(null, { status: 304, headers });
    }
    if (!result.data) {
      return NextResponse.json(
        { error: "Team not found for this season." },
        { status: 404 },
      );
    }

    const response = TeamDetailsResponseSchema.parse({
      season: query.data.season,
      lastUpdated: result.metadata.lastUpdated,
      team: result.data,
    });
    return NextResponse.json(response, { headers });
  } catch (error: unknown) {
    console.error("Unable to load team details", error);
    return NextResponse.json(
      { error: "Team details are temporarily unavailable." },
      { status: 500 },
    );
  }
}
