import {
  boolean,
  integer,
  jsonb,
  snakeCase,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm/sql/sql'
import { user } from './auth'
export * from './auth'

export const steps = snakeCase.table(
  'steps',
  {
    id: uuid().defaultRandom().primaryKey(),
    userEmail: text()
      .notNull()
      .references(() => user.email),
    url: text().notNull(),
    sequenceId: text().notNull(),
    sequencePosition: integer().notNull().default(0),
    position: integer().notNull().default(0),

    name: text(),
    data: jsonb().notNull(),
    state: jsonb().notNull(),
    submitted: boolean().notNull().default(false),
    correct: boolean(),
    feedback: jsonb().default({}),

    created: timestamp().defaultNow().notNull(),
    deleted: boolean().notNull().default(false),
  },
  (table) => [
    uniqueIndex('steps_active_unique')
      .on(table.userEmail, table.url, table.sequenceId, table.sequencePosition, table.position)
      .where(sql`${table.deleted} = false`),
  ],
)
