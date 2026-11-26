import { db, tables } from '@learning/db'
import { query } from '@solidjs/router'
import { getRequestEvent } from '@solidjs/web'
import { live } from '@solidjs/web/server-functions'
import { and, eq, gte, sql } from 'drizzle-orm'
import * as v from 'valibot'
import { ensurePermissions } from '../permissions'
import type { StoredStep } from './base'
import type { ExerciseContext, ExerciseStats } from './context'
import type { Options } from './options'

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

const ExerciseKey = v.object({
  ...RawSequence.entries,
  sequencePosition: v.number(),
})
type ExerciseKey = v.InferInput<typeof ExerciseKey>

/**
 * In-process notifications of saved answers, enough for the single Bun server.
 * Several server instances would need Postgres LISTEN/NOTIFY instead.
 */
const changes = new EventTarget()
const changeKey = (ctx: ExerciseKey) =>
  JSON.stringify([ctx.url, ctx.sequenceId, ctx.sequencePosition])
const notifyChange = (ctx: ExerciseKey) => changes.dispatchEvent(new Event(changeKey(ctx)))

/**
 * Yields once per batch of changes to an exercise, until `signal` aborts.
 * Changes made while the consumer is busy are coalesced into one.
 */
async function* changesOf(ctx: ExerciseKey, signal?: AbortSignal) {
  let dirty = false
  let wake = () => {}
  const listener = () => {
    dirty = true
    wake()
  }
  const key = changeKey(ctx)
  changes.addEventListener(key, listener)
  // An async generator's return() waits for its pending await, so a disconnect must wake it
  signal?.addEventListener('abort', listener)
  try {
    while (!signal?.aborted) {
      if (!dirty) await new Promise<void>((resolve) => (wake = resolve))
      if (signal?.aborted) return
      dirty = false
      yield
    }
  } finally {
    changes.removeEventListener(key, listener)
    signal?.removeEventListener('abort', listener)
  }
}

export const fetchSequence = query(async (rawCtx: SequenceContext) => {
  'use server'
  if (!getRequestEvent()?.locals.user) return null
  await ensurePermissions(['exercise:readOwn'])
  const rows = await db.query.steps.findMany({
    columns: {
      name: true,
      data: true,
      state: true,
      correct: true,
      submitted: true,
      position: true,
      sequencePosition: true,
    },
    where: v.parse(SequenceContext, rawCtx),
  })
  return rows.reduce(
    (result, { position, sequencePosition, ...step }) => {
      result[sequencePosition] ??= {}
      result[sequencePosition][position] = step as StoredStep
      return result
    },
    {} as Record<number, Record<number, StoredStep | undefined | null>>,
  )
}, 'fetchSequence')

export const getProgress = query(async (rawSequence: SequenceContext) => {
  'use server'
  if (!getRequestEvent()?.locals.user) return null
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
  return Object.fromEntries(
    rows.map((r) => [r.i, r.correct] as const).filter(([_i, correct]) => correct !== null),
  )
}, 'getProgress')

export const saveStep = async (rawCtx: StepContext, step: StoredStep, options: Options) => {
  'use server'
  await ensurePermissions(['exercise:answerOwn'])
  const ctx = v.parse(StepContext, rawCtx)
  const { name, data, state, submitted, correct } = step
  const row = { name, data, state, submitted, correct }
  const currentExercise = and(
    eq(tables.steps.userEmail, ctx.userEmail),
    eq(tables.steps.url, ctx.url),
    eq(tables.steps.sequenceId, ctx.sequenceId),
    eq(tables.steps.sequencePosition, ctx.sequencePosition),
  )
  await db.transaction(async (tx) => {
    if (options.allowResubmissions) {
      const condition = and(
        currentExercise,
        gte(tables.steps.position, ctx.position),
        eq(tables.steps.deleted, false),
        eq(tables.steps.submitted, true),
        eq(tables.steps.correct, false),
      )
      if (options.softDelete) {
        await tx.update(tables.steps).set({ deleted: true }).where(condition)
      } else {
        await tx.delete(tables.steps).where(condition)
      }
    }
    await tx
      .insert(tables.steps)
      .values({ ...ctx, ...row })
      .onConflictDoUpdate({
        target: [
          tables.steps.userEmail,
          tables.steps.url,
          tables.steps.sequenceId,
          tables.steps.sequencePosition,
          tables.steps.position,
        ],
        set: { ...row, deleted: false },
        setWhere: sql`${tables.steps.submitted} = false`,
        targetWhere: sql`${tables.steps.deleted} = false`,
      })
  })
  notifyChange(ctx)
}

export const reset = async (rawCtx: Omit<StepContext, 'position'>, options: Options) => {
  'use server'
  await ensurePermissions(['exercise:deleteOwn'])
  const ctx = v.parse(
    v.pipe(
      v.object({ ...RawSequence.entries, sequencePosition: v.number() }),
      v.transform(addEmail),
    ),
    rawCtx,
  )
  const currentExercise = and(
    eq(tables.steps.userEmail, ctx.userEmail),
    eq(tables.steps.url, ctx.url),
    eq(tables.steps.sequenceId, ctx.sequenceId),
    eq(tables.steps.sequencePosition, ctx.sequencePosition),
    eq(tables.steps.deleted, false),
  )

  await db.transaction(async (tx) => {
    const [step] = await tx
      .select()
      .from(tables.steps)
      .where(and(currentExercise, eq(tables.steps.position, 0)))
      .limit(1)
    if (!step) throw new Error('Initial step not found')
    if (options.softDelete) {
      await tx.update(tables.steps).set({ deleted: true }).where(currentExercise)
    } else {
      await tx.delete(tables.steps).where(currentExercise)
    }
    await tx.insert(tables.steps).values({
      ...step,
      id: undefined,
      submitted: false,
      correct: null,
    })
  })
  notifyChange(ctx)
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

async function exerciseStats(ctx: ExerciseKey): Promise<ExerciseStats> {
  const students = await db
    .select({
      email: exercise.userEmail,
      name: tables.user.name,
      correct: exercise.correct,
      submitted: exercise.submitted,
    })
    .from(exercise)
    .innerJoin(tables.user, eq(tables.user.email, exercise.userEmail))
    .where(
      and(
        eq(exercise.url, ctx.url),
        eq(exercise.sequenceId, ctx.sequenceId),
        eq(exercise.sequencePosition, ctx.sequencePosition),
      ),
    )
    .orderBy(tables.user.name)
  return { students }
}

export const watchStats = live(async function* (rawCtx: ExerciseKey) {
  'use server'
  await ensurePermissions(['exercise:read'])
  const ctx = v.parse(ExerciseKey, rawCtx)
  const signal = getRequestEvent()?.request.signal
  yield await exerciseStats(ctx)
  for await (const _ of changesOf(ctx, signal)) yield await exerciseStats(ctx)
})

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
    submitted: sql<boolean>`bool_or(${tables.steps.submitted})`.as('submitted'),
  })
  .from(tables.steps)
  .where(and(eq(tables.steps.deleted, false)))
  .groupBy(
    tables.steps.userEmail,
    tables.steps.url,
    tables.steps.sequenceId,
    tables.steps.sequencePosition,
  )
  .as('exercise')

export default {
  fetchSequence,
  getProgress,
  saveStep,
  reset,
  getStats,
  watchStats,
} as ExerciseContext
