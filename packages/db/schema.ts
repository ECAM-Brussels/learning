import { primaryKey } from 'drizzle-orm/cockroach-core/primary-keys'
import { boolean, integer, jsonb, snakeCase, text, timestamp } from 'drizzle-orm/pg-core'

export const steps = snakeCase.table(
  'steps',
  {
    userEmail: text().notNull(),
    url: text().notNull(),
    sequenceId: text().notNull(),
    sequencePosition: integer().notNull().default(0),
    position: integer().notNull().default(0),

    name: text(),
    data: jsonb().notNull(),
    state: jsonb().notNull(),
    correct: boolean().notNull(),

    created: timestamp().defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userEmail, t.url, t.sequenceId, t.sequencePosition, t.position] }),
  ],
)
