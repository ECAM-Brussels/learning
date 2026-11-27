import {
  boolean,
  index,
  integer,
  jsonb,
  real,
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

    created: timestamp().defaultNow().notNull(),
    deleted: boolean().notNull().default(false),
  },
  (table) => [
    uniqueIndex('steps_active_unique')
      .on(table.userEmail, table.url, table.sequenceId, table.sequencePosition, table.position)
      .where(sql`${table.deleted} = false`),
  ],
)

/** A time a deck was presented and drawn on, such as one group's lecture. */
export const annotationSessions = snakeCase.table(
  'annotation_sessions',
  {
    id: uuid().defaultRandom().primaryKey(),
    url: text().notNull(),
    /** The deck's `id` on its page, `''` without one. */
    deck: text().notNull(),
    name: text().notNull(),
    createdBy: text()
      .notNull()
      .references(() => user.email),
    created: timestamp().defaultNow().notNull(),
    /** Who presents the session while it is live, which students follow; null once it has ended. */
    presenter: text().references(() => user.email),
    /** The presenter's slide: `{ h, v, f }` as reveal.js gives it. */
    slide: jsonb(),
  },
  (table) => [index('annotation_sessions_deck').on(table.url, table.deck)],
)

export const strokes = snakeCase.table(
  'strokes',
  {
    /** Chosen by the browser that draws it, so that undo can refer to it before it is saved. */
    id: uuid().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => annotationSessions.id, { onDelete: 'cascade' }),
    /** The slide's reveal.js indices, `h.v`. */
    slide: text().notNull(),
    userEmail: text()
      .notNull()
      .references(() => user.email),
    tool: text().notNull(),
    color: text().notNull(),
    width: real().notNull(),
    /** `[x, y, pressure]` in the slide's coordinates, 1280 by 720. */
    points: jsonb().notNull(),
    created: timestamp().defaultNow().notNull(),
    /** Erased or undone: kept, so that undo can bring it back. */
    deleted: boolean().notNull().default(false),
  },
  (table) => [index('strokes_session').on(table.sessionId)],
)
