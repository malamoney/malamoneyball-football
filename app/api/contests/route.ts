import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getSeasonContests } from "@/src/database/contests";
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
    const contests = await withDatabase((sql) =>
      getSeasonContests(sql, leagueId, query.data.season)
    );
    const response = ContestsResponseSchema.parse({
      season: query.data.season,
      contests,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Unable to load contests", error);
    return NextResponse.json(
      { error: "Contests are temporarily unavailable." },
      { status: 500 },
    );
  }
}
