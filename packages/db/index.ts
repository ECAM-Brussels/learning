import * as authSchema from '@learning/auth/schema'
import { defineRelations } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/valibot'
import * as v from 'valibot'
import { env } from 'virtual:env/server'
import * as tables from './schema'
export * as tables from './schema'

export namespace Step {
  const pk = ['userEmail', 'url', 'sequenceId', 'sequencePosition', 'position'] as const
  export const Schema = createSelectSchema(tables.steps, {
    userEmail: (schema) => v.pipe(schema, v.email()),
  })
  export const Primary = v.pick(Schema, pk)
  export type Primary = v.InferInput<typeof Primary>
  export const ExerciseKey = v.pick(Schema, ['userEmail', 'url', 'sequenceId', 'sequencePosition'])
  export type ExerciseKey = v.InferInput<typeof ExerciseKey>
  export const Payload = v.omit(
    createInsertSchema(tables.steps, {
      userEmail: (schema) => v.pipe(schema, v.email()),
    }),
    pk,
  )
  export type Payload = v.InferInput<typeof Payload>
}

export type Step = v.InferOutput<typeof Step.Schema>

export const schema = {
  ...tables,
  ...authSchema,
}

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session({ from: r.user.id, to: r.session.userId }),
    accounts: r.many.account({ from: r.user.id, to: r.account.userId }),
    steps: r.many.steps({ from: r.user.email, to: r.steps.userEmail }),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id }),
  },
  account: {
    user: r.one.user({ from: r.account.userId, to: r.user.id }),
  },
  steps: {
    user: r.one.user({ from: r.steps.userEmail, to: r.user.email }),
  },
}))

export const db = drizzle(env.DATABASE_URL, { relations })
