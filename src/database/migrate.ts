import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type { DatabaseClient } from "./client.js";

const migrationsDirectory = fileURLToPath(
  new URL("../../migrations", import.meta.url),
);

export async function migrateDatabase(sql: DatabaseClient): Promise<string[]> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      migration_name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY
  `;

  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const appliedRows = await sql<{ migration_name: string }[]>`
    SELECT migration_name
    FROM public.schema_migrations
  `;
  const applied = new Set(appliedRows.map((row) => row.migration_name));
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const migration = await readFile(path.join(migrationsDirectory, file), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO public.schema_migrations (migration_name)
        VALUES (${file})
      `;
    });
    newlyApplied.push(file);
  }

  return newlyApplied;
}
