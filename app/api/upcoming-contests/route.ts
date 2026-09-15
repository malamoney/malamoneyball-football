import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getUpcomingContests } from "@/src/database/upcoming-contests";
import { UpcomingContestsResponseSchema } from "@/src/web-schemas";

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
    const upcomingContests = await withDatabase((sql) =>
      getUpcomingContests(
        sql,
        process.env.DK_LEAGUE_ID ?? defaultLeagueId,
        query.data.season,
      )
    );
    return NextResponse.json(
      UpcomingContestsResponseSchema.parse({ upcomingContests }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error: unknown) {
    console.error("Unable to load upcoming contests", error);
    return NextResponse.json(
      { error: "Upcoming contests are temporarily unavailable." },
      { status: 500 },
    );
  }
}
