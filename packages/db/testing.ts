import { PGlite } from '@electric-sql/pglite'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api-postgres'
import { drizzle } from 'drizzle-orm/pglite'
import { relations, schema } from './relations'
import { user } from './schema'

/**
 * A Postgres database for tests, in memory, with the schema of `schema.ts`.
 * It runs in the test process (PGlite), so tests need no database server, and can't reach a real one.
 */
export async function createTestDatabase() {
  const client = new PGlite()
  const statements = await generateMigration(
    await generateDrizzleJson({}),
    await generateDrizzleJson(schema),
  )
  for (const statement of statements) await client.exec(statement)
  const db = drizzle({ client, relations })

  return {
    db,
    /** Empties every table, e.g. before each test. */
    async clear() {
      const { rows } = await client.query<{ name: string }>(
        `select quote_ident(tablename) as name from pg_tables where schemaname = 'public'`,
      )
      await client.exec(`truncate ${rows.map((row) => row.name).join(', ')} cascade`)
    },
    /** Adds a user, whom answers must belong to. */
    async addUser(email: string, name = email.split('@')[0]!) {
      await db.insert(user).values({ id: email, email, name })
      return { id: email, email, name }
    },
    close: () => client.close(),
  }
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>
