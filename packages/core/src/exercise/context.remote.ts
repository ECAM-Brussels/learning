import { db, tables } from '@learning/db'
import { query } from '@solidjs/router'
import { getRequestEvent } from '@solidjs/web'
import { and, eq, sql } from 'drizzle-orm'
import * as v from 'valibot'
import type { StoredStep } from './base'
import type { ExerciseContext } from './context'

function addEmail<T>(ctx: T) {
  const user = getRequestEvent()?.locals.user
  if (!user) throw new Error('User not logged in')
  return { ...ctx, userEmail: user.email as string }
}

const RawSequence = v.object({
  url: v.string(),
  sequenceId: v.string(),
})

const SequenceContext = v.pipe(RawSequence, v.transform(addEmail))
type SequenceContext = v.InferInput<typeof SequenceContext>

const StepContext = v.pipe(
  v.object({
    ...RawSequence.entries,
    sequencePosition: v.number(),
    position: v.number(),
  }),
  v.transform(addEmail),
)
type StepContext = v.InferInput<typeof StepContext>

export const fetchStep = query(async (rawCtx: StepContext) => {
  'use server'
  const res = await db.query.steps.findFirst({
    columns: { name: true, data: true, state: true, correct: true, feedback: true },
    where: v.parse(StepContext, rawCtx),
  })
  return (res as StoredStep) ?? null
}, 'fetchStep')

export const getProgress = query(async (rawSequence: SequenceContext) => {
  'use server'
  const sequence = v.parse(SequenceContext, rawSequence)
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
        eq(tables.steps.userEmail, sequence.userEmail),
        eq(tables.steps.url, sequence.url),
        eq(tables.steps.sequenceId, sequence.sequenceId),
      ),
    )
    .groupBy(tables.steps.sequencePosition)
    .orderBy(tables.steps.sequencePosition)
  return Object.fromEntries(rows.map((r) => [r.i, r.progress] as const))
}, 'getProgress')

export const saveStep = async (rawCtx: StepContext, step: StoredStep) => {
  'use server'
  const ctx = v.parse(StepContext, rawCtx)
  await db.insert(tables.steps).values({ ...ctx, ...step })
}

export const reset = async (rawCtx: Omit<StepContext, 'position'>) => {
  'use server'
  const ctx = v.parse(
    v.pipe(
      v.object({ ...RawSequence.entries, sequencePosition: v.number() }),
      v.transform(addEmail),
    ),
    rawCtx,
  )
  await db
    .delete(tables.steps)
    .where(
      and(
        eq(tables.steps.userEmail, ctx.userEmail),
        eq(tables.steps.url, ctx.url),
        eq(tables.steps.sequenceId, ctx.sequenceId),
        eq(tables.steps.sequencePosition, ctx.sequencePosition),
      ),
    )
}

export default { fetchStep, getProgress, saveStep, reset } satisfies ExerciseContext
