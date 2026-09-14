import postgres from "postgres";

export type DatabaseClient = ReturnType<typeof postgres>;

export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  if (!databaseUrl.trim()) {
    throw new Error("DATABASE_URL must not be empty.");
  }

  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ssl: "require",
  });
}

export function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase Session Pooler URL to .env.",
    );
  }

  return databaseUrl;
}

export async function withDatabase<T>(
  callback: (sql: DatabaseClient) => Promise<T>,
): Promise<T> {
  const sql = createDatabaseClient(requireDatabaseUrl());
  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
