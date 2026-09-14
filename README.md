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
2. Extracts its `contestKey`, `name`, and `draftGroupId`, derives `season` by
   removing the trailing `week <number>` from the name, then requests that
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
  "season": "malamoneyball 2026",
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

To retain a local copy without importing it, run:

```bash
npm run getcontestresults
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

## Supabase database

Set `DATABASE_URL` in `.env` to the Supabase Session Pooler connection string
with `sslmode=require`. Keep this value private.

Apply pending migrations:

```bash
npm run db:migrate
```

The schema stores leagues, season identifiers, contests, entries, players,
rosters, raw import payloads, and manual result overrides. Each season has a
required `name`. Contest imports verify that it matches the fetched result's
top-level `season` property and persist that value. PostgreSQL views calculate
effective contest outcomes and season standings, including `season_name`. Row
Level Security is enabled without public policies; frontend read policies will
be added with the React application.

Set the season explicitly in `.env` so contests cannot be imported into the
wrong year's standings:

```dotenv
SEASON_YEAR=2026
SEASON_NAME=malamoneyball 2026
```

The participant, contest import, and standings commands can override the year
with `--season YYYY`. Participant registration can override the name with
`--season-name NAME`.

### Configure season membership

Every expected participant must be configured for the season before its first
contest import. Add each participant using their stable DraftKings `userKey`:

```bash
npm run participant:add -- \
  --season 2026 \
  --season-name "malamoneyball 2026" \
  --user-key 4034388 \
  --user-name malamoney
```

Adding a participant creates the season when needed. The importer rejects
unknown or duplicate participants. Configured participants missing from
DraftKings are inserted with zero points and placed last. Imports also fail
unless that season's active membership count matches
`EXPECTED_PARTICIPANT_COUNT`, which defaults to 14.

### Import a contest

Fetch and transactionally store the latest completed contest:

```bash
npm run contest:import -- --season 2026
```

The command is safe to rerun. Imported facts are updated, raw payloads are
archived, missing participants retain their default rows, and manual overrides
are not overwritten.

### View standings

```bash
npm run standings -- --season 2026
```

The output contains `userKey`, `participantName`, `wins`, `losses`, `ties`, and
`totalPoints`. Results are calculated from effective fantasy points across only
the selected season's contests. Starting a new season and registering its
participants produces zeroed standings without affecting prior seasons.

For example, begin 2027 by registering its participants with `--season 2027`
and `--season-name "malamoneyball 2027"`, then update both `SEASON_YEAR` and
`SEASON_NAME` before importing that season's contests.

### Enter a manual result

Override a participant's fantasy points while retaining the original result:

```bash
npm run result:override -- \
  --contest-key 195471290 \
  --user-key 4034388 \
  --points 142.68 \
  --reason "Participant submitted results manually"
```

Remove an override and return to the imported/default result:

```bash
npm run result:override -- \
  --contest-key 195471290 \
  --user-key 4034388 \
  --clear
```

Every override change is recorded in an audit table. Rank and win/loss/tie
outcomes recalculate automatically.

## Validation

```bash
npm test
npm run typecheck
npm run db:verify
```

`db:verify` exercises standings and override behavior against Supabase inside a
transaction that is always rolled back.
