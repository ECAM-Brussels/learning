import { db, tables } from '@learning/db'
import { query } from '@solidjs/router'
import { and, eq, sql } from 'drizzle-orm'
import { getUser } from '../auth'
import type { StoredStep } from './base'
import type { ExerciseContext, StepContext } from './context'

export const fetchStep = query(async (ctx: StepContext) => {
  'use server'
  const user = await getUser()
  if (!user) return null
  const res = await db.query.steps.findFirst({
    columns: { name: true, data: true, state: true, correct: true, feedback: true },
    where: { userEmail: user.email, ...ctx },
  })
  return (res as StoredStep) ?? null
}, 'fetchStep')

export const getProgress = query(
  async (sequence: Omit<StepContext, 'position' | 'sequencePosition'>) => {
    'use server'
    const user = await getUser()
    if (!user) return {}
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
  },
  'getProgress',
)

export const saveStep = async (ctx: StepContext, step: StoredStep) => {
  'use server'
  const user = await getUser()
  if (!user) throw new Error('User not logged in')
  await db.insert(tables.steps).values({ userEmail: user.email, ...ctx, ...step })
}

export const reset = async (ctx: Omit<StepContext, 'position'>) => {
  'use server'
  const user = await getUser()
  if (!user) throw new Error('User not logged in')
  await db
    .delete(tables.steps)
    .where(
      and(
        eq(tables.steps.userEmail, user.email),
        eq(tables.steps.url, ctx.url),
        eq(tables.steps.sequenceId, ctx.sequenceId),
        eq(tables.steps.sequencePosition, ctx.sequencePosition),
      ),
    )
}

export default { fetchStep, getProgress, saveStep, reset } satisfies ExerciseContext
