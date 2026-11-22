import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../src/db/schema";

/** In-memory real Postgres (WASM). Runs your actual migrations. */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });

  return {
    db,
    reset: () => db.execute(sql`TRUNCATE users RESTART IDENTITY CASCADE`),
    close: () => client.close(),
  };
}
