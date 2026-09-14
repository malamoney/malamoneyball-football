import { migrateDatabase } from "./database/migrate.js";
import { withDatabase } from "./database/client.js";

async function main(): Promise<void> {
  const applied = await withDatabase(migrateDatabase);
  if (applied.length === 0) {
    console.log("Database schema is already up to date.");
    return;
  }

  console.log("Applied migrations: " + applied.join(", "));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Unable to migrate database: " + message);
  process.exitCode = 1;
});
