import { drizzle } from 'drizzle-orm/node-postgres'
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/valibot'
import * as v from 'valibot'
import { type env as serverEnv } from 'virtual:solid-env/server'
import { relations } from './relations'
import * as tables from './schema'
export { relations, schema } from './relations'
export * as tables from './schema'

const env = process.env as unknown as typeof serverEnv

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

export const db = drizzle(env.DATABASE_URL, { relations })
