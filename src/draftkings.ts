import {
  ContestLeaderboardSchema,
  DraftKingsContestsResponseSchema,
  DraftKingsDraftablesResponseSchema,
  DraftKingsLeaderboardResponseSchema,
  DraftKingsRosterResponseSchema,
  parseSchema,
  type ContestLeaderboard,
  type RosterPlayer,
} from "./schemas.js";

const DEFAULT_BASE_URL = "https://api.draftkings.com";
const DEFAULT_LEAGUE_ID = "uyqc2yy8";
const DEFAULT_TIMEOUT_MS = 15_000;

export type {
  ContestLeaderboard,
  LeaderboardEntry,
  RosterPlayer,
} from "./schemas.js";

interface DraftableDetails {
  salary: number;
  playerImage: string;
}

export function deriveSeasonName(contestName: string): string {
  return contestName.replace(/\s+week\s+\d+\s*$/i, "").trim();
}

export interface DraftKingsClientOptions {
  cookie: string;
  leagueId?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

async function responseError(response: Response): Promise<Error> {
  const body = (await response.text()).slice(0, 500).trim();
  const details = body ? `: ${body}` : "";
  return new Error(
    `DraftKings API request failed (${response.status} ${response.statusText})${details}`,
  );
}

async function requestJson(
  url: URL,
  headers: HeadersInit,
  fetchImpl: typeof globalThis.fetch,
  timeoutMs: number,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw await responseError(response);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    throw new Error(
      `DraftKings API returned an unexpected content type: ${contentType || "unknown"}`,
    );
  }

  return response.json() as Promise<unknown>;
}

async function fetchDraftables(
  draftGroupId: number,
  baseUrl: string,
  headers: HeadersInit,
  fetchImpl: typeof globalThis.fetch,
  timeoutMs: number,
): Promise<Map<number, DraftableDetails>> {
  const draftablesUrl = new URL(
    "/draftgroups/v1/draftgroups/" +
      encodeURIComponent(String(draftGroupId)) + "/draftables",
    baseUrl,
  );
  const response = parseSchema(
    DraftKingsDraftablesResponseSchema,
    await requestJson(draftablesUrl, headers, fetchImpl, timeoutMs),
    "DraftKings draftables response",
  );

  const draftablesById = new Map<number, DraftableDetails>();
  response.draftables.forEach((draftable) => {
    draftablesById.set(draftable.draftableId, {
      salary: draftable.salary,
      playerImage: draftable.playerImage160,
    });
  });

  return draftablesById;
}

async function fetchRoster(
  draftGroupId: number,
  entryKey: string,
  draftablesById: ReadonlyMap<number, DraftableDetails>,
  baseUrl: string,
  headers: HeadersInit,
  fetchImpl: typeof globalThis.fetch,
  timeoutMs: number,
): Promise<RosterPlayer[]> {
  const rosterUrl = new URL(
    "/scores/v2/entries/" + encodeURIComponent(String(draftGroupId)) +
      "/" + encodeURIComponent(entryKey),
    baseUrl,
  );
  rosterUrl.search = new URLSearchParams({
    format: "json",
    embed: "roster",
  }).toString();

  const response = parseSchema(
    DraftKingsRosterResponseSchema,
    await requestJson(rosterUrl, headers, fetchImpl, timeoutMs),
    "DraftKings roster response for entry " + entryKey,
  );

  const entry = response.entries[0]!;
  return entry.roster.scorecards.map((scorecard) => {
    const fantasyPoints = scorecard.stats.reduce(
      (total, stat) => total + stat.fantasyPoints,
      0,
    );

    const draftableId = scorecard.draftableId;
    const draftable = draftablesById.get(draftableId);
    if (!draftable) {
      throw new Error(
        "No draftable data was returned for draftableId " + draftableId +
          " on entry " + entryKey + ".",
      );
    }

    return {
      name: scorecard.displayName,
      draftableId,
      position: scorecard.rosterPosition,
      percentDrafted: scorecard.percentDrafted,
      statsDescription: scorecard.statsDescription,
      fantasyPoints,
      playerImage: draftable.playerImage,
      salary: draftable.salary,
    };
  });
}

/**
 * Fetches the newest historical contest for a league, then returns its key,
 * name, derived season name, draft group ID, and leaderboard.
 */
export async function getLatestContestLeaderboard(
  options: DraftKingsClientOptions,
): Promise<ContestLeaderboard> {
  const cookie = options.cookie.trim();
  if (!cookie) {
    throw new Error("A non-empty DraftKings Cookie header is required.");
  }

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const leagueId = options.leagueId ?? DEFAULT_LEAGUE_ID;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetch ?? globalThis.fetch;

  const headers: HeadersInit = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    cookie,
    origin: "https://www.draftkings.com",
    referer: "https://www.draftkings.com/",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  };

  const contestsUrl = new URL(
    `/contests/v1/contestsets/league/${encodeURIComponent(leagueId)}/historical`,
    baseUrl,
  );
  contestsUrl.search = new URLSearchParams({
    limit: "1",
    offset: "0",
    format: "json",
  }).toString();

  const contestsResponse = parseSchema(
    DraftKingsContestsResponseSchema,
    await requestJson(contestsUrl, headers, fetchImpl, timeoutMs),
    "DraftKings contests response",
  );
  const contest = contestsResponse.contests[0]!;
  const draftGroupId = contest.draftGroupId;

  const leaderboardUrl = new URL(
    `/scores/v1/leaderboards/${encodeURIComponent(contest.contestKey)}`,
    baseUrl,
  );
  leaderboardUrl.search = new URLSearchParams({
    format: "json",
    embed: "leaderboard",
  }).toString();

  const [leaderboardJson, draftablesById] = await Promise.all([
    requestJson(leaderboardUrl, headers, fetchImpl, timeoutMs),
    fetchDraftables(draftGroupId, baseUrl, headers, fetchImpl, timeoutMs),
  ]);
  const leaderboardResponse = parseSchema(
    DraftKingsLeaderboardResponseSchema,
    leaderboardJson,
    "DraftKings leaderboard response",
  );

  const leaderboard = await Promise.all(
    leaderboardResponse.leaderBoard.map(async (participant) => {
      const roster = await fetchRoster(
        draftGroupId,
        participant.entryKey,
        draftablesById,
        baseUrl,
        headers,
        fetchImpl,
        timeoutMs,
      );

      return {
        ...participant,
        roster,
      };
    }),
  );

  return parseSchema(
    ContestLeaderboardSchema,
    {
      contestKey: contest.contestKey,
      name: contest.name,
      season: deriveSeasonName(contest.name),
      draftGroupId,
      leaderboard,
    },
    "normalized contest leaderboard",
  );
}
