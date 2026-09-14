# malamoneyball-football

Fetch the participant leaderboard for the latest historical contest in a
DraftKings league.

## Setup

Requires Node.js 20 or newer.

```bash
npm install
```

DraftKings session cookies are short-lived credentials. Copy the full `Cookie`
request header from an authenticated browser request and pass it at runtime;
never commit it to the repository.

```bash
DK_COOKIE='jwe=...; iv=...;' npm start
```

The command performs these calls in order:

1. Requests the latest historical contest for league `uyqc2yy8`.
2. Extracts its `contestKey`, `name`, and `draftGroupId`, then requests that
   contest's leaderboard.
3. Requests the draft group's player data once to build a salary and image
   lookup by `draftableId`.
4. Requests each participant's roster using the contest `draftGroupId` and the
   participant's `entryKey`.

It writes the contest metadata and `leaderboard` array as formatted JSON to
standard output, so it can be redirected to a file if desired:

```json
{
  "contestKey": "195471290",
  "name": "malamoneyball 2026 week 1",
  "draftGroupId": 151307,
  "leaderboard": [
    {
      "entryKey": "5253217266",
      "lineupId": 5687315610,
      "userName": "Dbmiller77",
      "userKey": "6842145",
      "rank": 1,
      "fantasyPoints": 167.1,
      "roster": [
        {
          "name": "Josh Allen",
          "draftableId": 12345678,
          "position": "QB",
          "percentDrafted": 18.4,
          "statsDescription": "Passing and rushing stats",
          "fantasyPoints": 19.75,
          "playerImage": "https://example.test/josh-allen.png",
          "salary": 8200
        }
      ]
    }
  ]
}
```

Each roster player's `fantasyPoints` is the sum of all `fantasyPoints` values
in that scorecard's `stats` array.

All DraftKings API responses are validated with Zod before they are used. The
final normalized result is also checked against a strict schema, making it safe
to use as the input boundary for database persistence.

```bash
DK_COOKIE='jwe=...; iv=...;' npm start > leaderboard.json
```

The league and API host can be overridden when needed:

```bash
DK_LEAGUE_ID='another-league-id' \
DK_API_BASE_URL='https://api.draftkings.com' \
DK_COOKIE='jwe=...; iv=...;' \
npm start
```

The reusable function is exported from `src/draftkings.ts`:

```ts
import { getLatestContestLeaderboard } from "./src/draftkings.js";

const contestLeaderboard = await getLatestContestLeaderboard({
  cookie: process.env.DK_COOKIE!,
});
```

## Validation

```bash
npm test
npm run typecheck
```
