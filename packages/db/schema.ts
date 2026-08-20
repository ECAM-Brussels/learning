import { boolean, integer, jsonb, snakeCase, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
export * from './auth'

export const steps = snakeCase.table('steps', {
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
  correct: boolean(),
  feedback: jsonb().default({}),

  created: timestamp().defaultNow().notNull(),
  deleted: boolean().notNull().default(false),
})
