import type { DatabaseClient } from "./database/client.js";

interface SeasonCacheRow {
  season_id: number;
  updated_at: Date;
}

// Increment when the cached API response contract changes.
const apiCacheVersion = "v2";

export interface SeasonCacheMetadata {
  etag: string;
  lastUpdated: string;
}

export type SeasonCachedResult<T> =
  | { status: "season-not-found" }
  | { status: "not-modified"; metadata: SeasonCacheMetadata }
  | { status: "ok"; metadata: SeasonCacheMetadata; data: T };

export async function getSeasonCacheMetadata(
  sql: DatabaseClient,
  leagueId: string,
  seasonName: string,
): Promise<SeasonCacheMetadata | null> {
  const rows = await sql<SeasonCacheRow[]>`
    SELECT season_id, updated_at
    FROM public.seasons
    WHERE league_id = ${leagueId}
      AND name = ${seasonName}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }

  const lastUpdated = row.updated_at.toISOString();
  return {
    etag: `"${apiCacheVersion}-season-${row.season_id}-${row.updated_at.getTime()}"`,
    lastUpdated,
  };
}

export function etagMatches(
  ifNoneMatch: string | null,
  etag: string,
): boolean {
  if (!ifNoneMatch) {
    return false;
  }

  return ifNoneMatch
    .split(",")
    .map((candidate) => candidate.trim().replace(/^W\//, ""))
    .some((candidate) => candidate === etag || candidate === "*");
}

export function seasonCacheHeaders(
  metadata: SeasonCacheMetadata,
): Record<string, string> {
  return {
    "Cache-Control": "private, no-cache, must-revalidate",
    ETag: metadata.etag,
    "Last-Modified": new Date(metadata.lastUpdated).toUTCString(),
  };
}

export async function loadSeasonCachedResource<T>(
  sql: DatabaseClient,
  leagueId: string,
  seasonName: string,
  ifNoneMatch: string | null,
  loader: () => Promise<T>,
): Promise<SeasonCachedResult<T>> {
  const metadata = await getSeasonCacheMetadata(sql, leagueId, seasonName);
  if (!metadata) {
    return { status: "season-not-found" };
  }
  if (etagMatches(ifNoneMatch, metadata.etag)) {
    return { status: "not-modified", metadata };
  }

  return { status: "ok", metadata, data: await loader() };
}
