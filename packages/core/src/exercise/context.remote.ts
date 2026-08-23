import { db, tables } from '@learning/db'
import { query } from '@solidjs/router'
import { getRequestEvent } from '@solidjs/web'
import { and, eq, sql } from 'drizzle-orm'
import * as v from 'valibot'
import { ensurePermissions } from '../permissions'
import type { StoredStep } from './base'
import type { ExerciseContext } from './context'

function addEmail<T>(ctx: T) {
  const user = getRequestEvent()?.locals.user
  if (!user) throw new Error('User not logged in')
  return { ...ctx, userEmail: user.email, deleted: false }
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
  await ensurePermissions(['exercise:readOwn'])
  const res = await db.query.steps.findFirst({
    columns: { name: true, data: true, state: true, correct: true, feedback: true },
    where: v.parse(StepContext, rawCtx),
  })
  return (res as StoredStep) ?? null
}, 'fetchStep')

export const getProgress = query(async (rawSequence: SequenceContext) => {
  'use server'
  await ensurePermissions(['exercise:readOwn'])
  const sequence = v.parse(SequenceContext, rawSequence)
  const rows = await db
    .select({ i: exercise.sequencePosition, correct: exercise.correct })
    .from(exercise)
    .where(
      and(
        eq(exercise.userEmail, sequence.userEmail),
        eq(exercise.url, sequence.url),
        eq(exercise.sequenceId, sequence.sequenceId),
      ),
    )
    .orderBy(exercise.sequencePosition)
  return Object.fromEntries(rows.map((r) => [r.i, r.correct] as const))
}, 'getProgress')

export const saveStep = async (rawCtx: StepContext, step: StoredStep) => {
  'use server'
  await ensurePermissions(['exercise:answerOwn'])
  const ctx = v.parse(StepContext, rawCtx)
  await db.insert(tables.steps).values({ ...ctx, ...step })
}

export const reset = async (rawCtx: Omit<StepContext, 'position'>) => {
  'use server'
  await ensurePermissions(['exercise:deleteOwn'])
  const ctx = v.parse(
    v.pipe(
      v.object({ ...RawSequence.entries, sequencePosition: v.number() }),
      v.transform(addEmail),
    ),
    rawCtx,
  )
  await db
    .update(tables.steps)
    .set({ deleted: true })
    .where(
      and(
        eq(tables.steps.userEmail, ctx.userEmail),
        eq(tables.steps.url, ctx.url),
        eq(tables.steps.sequenceId, ctx.sequenceId),
        eq(tables.steps.sequencePosition, ctx.sequencePosition),
        eq(tables.steps.deleted, false),
      ),
    )
}

export const getStats = query(async (rawSequence: SequenceContext) => {
  'use server'
  await ensurePermissions(['exercise:read'])
  const sequence = v.parse(SequenceContext, rawSequence)
  return await db
    .select({
      email: exercise.userEmail,
      name: tables.user.name,
      progress: sql<{ i: number; correct: boolean | null }[]>`
        json_agg(
          json_build_object(
            'i', ${exercise.sequencePosition},
            'correct', ${exercise.correct}
          )
          order by ${exercise.sequencePosition}
        )
      `,
    })
    .from(exercise)
    .innerJoin(tables.user, eq(tables.user.email, exercise.userEmail))
    .where(and(eq(exercise.url, sequence.url), eq(exercise.sequenceId, sequence.sequenceId)))
    .groupBy(exercise.userEmail, tables.user.name)
}, 'getStats')

const exercise = db
  .select({
    userEmail: tables.steps.userEmail,
    url: tables.steps.url,
    sequenceId: tables.steps.sequenceId,
    sequencePosition: tables.steps.sequencePosition,
    correct: sql<boolean | null>`
      case
        when bool_or(${tables.steps.correct} = false) then false
        when bool_or(${tables.steps.correct} is null) then null
        else true
      end
    `.as('correct'),
  })
  .from(tables.steps)
  .where(eq(tables.steps.deleted, false))
  .groupBy(
    tables.steps.userEmail,
    tables.steps.url,
    tables.steps.sequenceId,
    tables.steps.sequencePosition,
  )
  .as('exercise')

export default { fetchStep, getProgress, saveStep, reset, getStats } satisfies ExerciseContext
