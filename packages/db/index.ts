import { defineRelations } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
export * from './schema'

export const relations = defineRelations(schema, () => ({}))

export const db = drizzle(process.env.DATABASE_URL!, { relations })
