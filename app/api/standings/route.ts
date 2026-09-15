import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getSeasonStandings } from "@/src/database/standings";
import {
  loadSeasonCachedResource,
  seasonCacheHeaders,
} from "@/src/season-cache";
import { StandingsResponseSchema } from "@/src/web-schemas";

const querySchema = z.object({
  season: z.string().trim().min(1),
});

const defaultLeagueId = "uyqc2yy8";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = querySchema.safeParse({
    season: request.nextUrl.searchParams.get("season"),
  });
  if (!query.success) {
    return NextResponse.json(
      { error: "A season query parameter is required." },
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
        () => getSeasonStandings(sql, leagueId, query.data.season),
      )
    );
    if (result.status === "season-not-found") {
      return NextResponse.json({ error: "Season not found." }, { status: 404 });
    }
    const headers = seasonCacheHeaders(result.metadata);
    if (result.status === "not-modified") {
      return new NextResponse(null, { status: 304, headers });
    }
    const response = StandingsResponseSchema.parse({
      season: query.data.season,
      lastUpdated: result.metadata.lastUpdated,
      standings: result.data,
    });

    return NextResponse.json(response, { headers });
  } catch (error: unknown) {
    console.error("Unable to load standings", error);
    return NextResponse.json(
      { error: "Standings are temporarily unavailable." },
      { status: 500 },
    );
  }
}
