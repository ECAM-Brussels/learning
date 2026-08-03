import { db, tables } from '@learning/db'
import { query } from '@solidjs/router'
import { and, eq, sql } from 'drizzle-orm'
import type { StoredStep } from './base'
import type { StepContext } from './context'

export const fetchStep = query(async (ctx: StepContext) => {
  'use server'
  const res = await db.query.steps.findFirst({
    columns: { name: true, data: true, state: true, correct: true, feedback: true },
    where: { userEmail: 'ngy@ecam.be', ...ctx },
  })
  return (res as StoredStep) ?? null
}, 'fetchStep')

export const getProgress = query(async (ctx: StepContext) => {
  'use server'
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
        eq(tables.steps.userEmail, 'ngy@ecam.be'),
        eq(tables.steps.url, sequence.url),
        eq(tables.steps.sequenceId, sequence.sequenceId),
      ),
    )
    .groupBy(tables.steps.sequencePosition)
    .orderBy(tables.steps.sequencePosition)
  return Object.fromEntries(rows.map((r) => [r.i, r.progress] as const))
}, 'getProgress')

export const saveStep = async (ctx: StepContext, step: StoredStep) => {
  'use server'
  await db.insert(tables.steps).values({ userEmail: 'ngy@ecam.be', ...ctx, ...step })
}
