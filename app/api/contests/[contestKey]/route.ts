import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

import { withDatabase } from "@/src/database/client";
import { getContestDetails } from "@/src/database/contest-details";
import { ContestDetailsResponseSchema } from "@/src/web-schemas";

const querySchema = z.object({
  season: z.string().trim().min(1),
});

const paramsSchema = z.object({
  contestKey: z.string().trim().min(1),
});

const defaultLeagueId = "uyqc2yy8";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contestKey: string }> },
) {
  const query = querySchema.safeParse({
    season: request.nextUrl.searchParams.get("season"),
  });
  const params = paramsSchema.safeParse(await context.params);

  if (!query.success || !params.success) {
    return NextResponse.json(
      { error: "A valid contest and season are required." },
      { status: 400 },
    );
  }

  try {
    const leagueId = process.env.DK_LEAGUE_ID ?? defaultLeagueId;
    const contest = await withDatabase((sql) =>
      getContestDetails(
        sql,
        leagueId,
        query.data.season,
        params.data.contestKey,
      )
    );
    if (!contest) {
      return NextResponse.json(
        { error: "Contest not found for this season." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      ContestDetailsResponseSchema.parse({
        season: query.data.season,
        contest,
      }),
    );
  } catch (error: unknown) {
    console.error("Unable to load contest details", error);
    return NextResponse.json(
      { error: "Contest details are temporarily unavailable." },
      { status: 500 },
    );
  }
}
