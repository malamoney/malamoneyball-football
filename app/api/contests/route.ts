import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getSeasonContests } from "@/src/database/contests";
import {
  loadSeasonCachedResource,
  seasonCacheHeaders,
} from "@/src/season-cache";
import { ContestsResponseSchema } from "@/src/web-schemas";

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
        () => getSeasonContests(sql, leagueId, query.data.season),
      )
    );
    if (result.status === "season-not-found") {
      return NextResponse.json({ error: "Season not found." }, { status: 404 });
    }
    const headers = seasonCacheHeaders(result.metadata);
    if (result.status === "not-modified") {
      return new NextResponse(null, { status: 304, headers });
    }
    const response = ContestsResponseSchema.parse({
      season: query.data.season,
      lastUpdated: result.metadata.lastUpdated,
      contests: result.data,
    });

    return NextResponse.json(response, { headers });
  } catch (error: unknown) {
    console.error("Unable to load contests", error);
    return NextResponse.json(
      { error: "Contests are temporarily unavailable." },
      { status: 500 },
    );
  }
}
