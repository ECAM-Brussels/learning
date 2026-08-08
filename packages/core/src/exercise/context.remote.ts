import { db, tables } from '@learning/db'
import { and, eq, sql } from 'drizzle-orm'
import { getUser } from '../auth'
import type { StoredStep } from './base'
import type { StepContext } from './context'

export const fetchStep = async (ctx: StepContext) => {
  'use server'
  const user = await getUser()
  if (!user) throw new Error('User not logged in')
  const res = await db.query.steps.findFirst({
    columns: { name: true, data: true, state: true, correct: true, feedback: true },
    where: { userEmail: user.email, ...ctx },
  })
  return (res as StoredStep) ?? null
}

export const getProgress = async (ctx: StepContext) => {
  'use server'
  const user = await getUser()
  if (!user) throw new Error('User not logged in')
  const { sequencePosition, position, ...sequence } = ctx
  const rows = await db
    .select({
      i: tables.steps.sequencePosition,
      progress: sql<boolean | null>`
        case
          when count(${tables.steps.correct}) = 0 then null
          else bool_and(coalesce(${tables.steps.correct}, false))
        end
      `,
    })
    .from(tables.steps)
    .where(
      and(
        eq(tables.steps.userEmail, user.email),
        eq(tables.steps.url, sequence.url),
        eq(tables.steps.sequenceId, sequence.sequenceId),
      ),
    )
    .groupBy(tables.steps.sequencePosition)
    .orderBy(tables.steps.sequencePosition)
  return Object.fromEntries(rows.map((r) => [r.i, r.progress] as const))
}

export const saveStep = async (ctx: StepContext, step: StoredStep) => {
  'use server'
  const user = await getUser()
  if (!user) throw new Error('User not logged in')
  await db.insert(tables.steps).values({ userEmail: user.email, ...ctx, ...step })
}
