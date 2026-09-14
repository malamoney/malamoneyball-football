import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getSeasonStandings } from "@/src/database/standings";
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
    const standings = await withDatabase((sql) =>
      getSeasonStandings(sql, leagueId, query.data.season)
    );
    const response = StandingsResponseSchema.parse({
      season: query.data.season,
      standings,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Unable to load standings", error);
    return NextResponse.json(
      { error: "Standings are temporarily unavailable." },
      { status: 500 },
    );
  }
}
