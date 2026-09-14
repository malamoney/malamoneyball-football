import { readFile } from "node:fs/promises";

import { withDatabase } from "./database/client.js";

async function main(): Promise<void> {
  const verificationUrl = new URL(
    "../scripts/verify-database.sql",
    import.meta.url,
  );
  const verification = await readFile(verificationUrl, "utf8");
  await withDatabase((sql) => sql.unsafe(verification).then(() => undefined));
  console.log("Database behavior verified; fixture transaction was rolled back.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Database verification failed: " + message);
  process.exitCode = 1;
});
