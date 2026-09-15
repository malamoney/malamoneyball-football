import assert from "node:assert/strict";
import test from "node:test";

import {
  etagMatches,
  seasonCacheHeaders,
  type SeasonCacheMetadata,
} from "../src/season-cache.js";

const metadata: SeasonCacheMetadata = {
  etag: '"v1-season-1-1789434000000"',
  lastUpdated: "2026-09-15T01:00:00.000Z",
};

test("matches strong, weak, and wildcard season etags", () => {
  assert.equal(etagMatches(metadata.etag, metadata.etag), true);
  assert.equal(etagMatches(`W/${metadata.etag}`, metadata.etag), true);
  assert.equal(etagMatches('"other", W/"v1-season-1-1789434000000"', metadata.etag), true);
  assert.equal(etagMatches("*", metadata.etag), true);
});

test("rejects missing or stale season etags", () => {
  assert.equal(etagMatches(null, metadata.etag), false);
  assert.equal(etagMatches('"v1-season-1-old"', metadata.etag), false);
});

test("creates browser-revalidation headers", () => {
  assert.deepEqual(seasonCacheHeaders(metadata), {
    "Cache-Control": "private, no-cache, must-revalidate",
    ETag: metadata.etag,
    "Last-Modified": "Tue, 15 Sep 2026 01:00:00 GMT",
  });
});
