import * as tables from '@learning/db/schema'
import { createTestDatabase } from '@learning/db/testing'
import * as web from '@solidjs/web'
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Options } from './options'

const database = await createTestDatabase()

/** The user of the current request: who the server functions act for. */
let user: { email: string; name: string } | null = null
let signal: AbortSignal | undefined

mock.module('@learning/db', () => ({ db: database.db, tables }))
mock.module('@solidjs/web', () => ({
  ...web,
  getRequestEvent: () => ({ locals: { user }, request: { signal } }),
}))
mock.module('@solidjs/web/server-functions', () => ({ live: <T>(fn: T) => fn }))
mock.module('virtual:solid-env/server', () => ({ env: { ADMINS: ['admin@example.com'] } }))

const remote = await import('./context.remote')

const student = { email: 'alice@student.ecam.be', name: 'Alice' }
const other = { email: 'bob@student.ecam.be', name: 'Bob' }
const teacher = { email: 'prof@ecam.be', name: 'Prof' }

const sequence = { url: '/course/limits', sequenceId: 'exam' }
const at = (sequencePosition: number, position = 0) => ({
  ...sequence,
  sequencePosition,
  position,
})
const options = (overrides: Partial<Options<'output'>> = {}) =>
  ({ allowResubmissions: false, softDelete: false, ...overrides }) as Options
const step = (state: Record<string, unknown>, correct?: boolean) => ({
  data: { expr: 'x^2 - 1' },
  state,
  submitted: correct !== undefined,
  correct,
})

/** Every row of the steps table, deleted ones included, in a stable order. */
const rows = () =>
  database.db
    .select()
    .from(tables.steps)
    .orderBy(tables.steps.userEmail, tables.steps.sequencePosition, tables.steps.position)

const as = (who: typeof user) => {
  user = who
}

beforeEach(async () => {
  await database.clear()
  for (const someone of [student, other, teacher])
    await database.addUser(someone.email, someone.name)
  as(student)
  signal = undefined
})

afterAll(() => database.close())

describe('saveStep', () => {
  test('stores a step for the logged-in user, found again by fetchSequence', async () => {
    await remote.saveStep(at(0), step({ attempt: '(x-1)(x+1)' }, true), options())
    expect(await rows()).toMatchObject([
      {
        userEmail: student.email,
        ...at(0),
        data: { expr: 'x^2 - 1' },
        state: { attempt: '(x-1)(x+1)' },
        submitted: true,
        correct: true,
        deleted: false,
      },
    ])
    expect(await remote.fetchSequence(sequence)).toEqual({
      0: {
        0: {
          name: null,
          data: { expr: 'x^2 - 1' },
          state: { attempt: '(x-1)(x+1)' },
          submitted: true,
          correct: true,
        },
      },
    })
  })

  test('keeps the steps of a conversation at their positions', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, false), options())
    await remote.saveStep(at(0, 1), step({ root: '1' }, true), options())
    await remote.saveStep(at(2), step({}), options())
    const saved = await remote.fetchSequence(sequence)
    expect(Object.keys(saved!)).toEqual(['0', '2'])
    expect(saved![0]![0]).toMatchObject({ state: { attempt: 'x' }, correct: false })
    expect(saved![0]![1]).toMatchObject({ state: { root: '1' }, correct: true })
    expect(saved![2]![0]).toMatchObject({ state: {}, submitted: false, correct: null })
  })

  test('updates a draft, but never overwrites a submitted answer', async () => {
    await remote.saveStep(at(0), step({}), options())
    await remote.saveStep(at(0), step({ attempt: 'x' }, false), options())
    await remote.saveStep(at(0), step({ attempt: 'y' }, true), options())
    expect(await rows()).toHaveLength(1)
    expect((await rows())[0]).toMatchObject({ state: { attempt: 'x' }, correct: false })
  })

  test('with allowResubmissions, a new answer replaces a wrong one and the remediation it opened', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, false), options())
    await remote.saveStep(at(0, 1), step({ root: '2' }, false), options())
    await remote.saveStep(at(1), step({ attempt: 'z' }, false), options())

    await remote.saveStep(
      at(0),
      step({ attempt: 'y' }, true),
      options({ allowResubmissions: true }),
    )
    expect(await rows()).toMatchObject([
      { ...at(0), state: { attempt: 'y' }, correct: true },
      // Another exercise of the sequence is left alone.
      { ...at(1), state: { attempt: 'z' }, correct: false },
    ])
  })

  test('with softDelete as well, the replaced answers are kept, marked deleted', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, false), options())
    await remote.saveStep(
      at(0),
      step({ attempt: 'y' }, true),
      options({ allowResubmissions: true, softDelete: true }),
    )
    expect(await rows()).toMatchObject([
      { state: { attempt: 'x' }, deleted: true },
      { state: { attempt: 'y' }, deleted: false },
    ])
    expect((await remote.fetchSequence(sequence))![0]![0]).toMatchObject({
      state: { attempt: 'y' },
    })
  })

  test('a correct answer is never replaced, even with allowResubmissions', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, true), options())
    await remote.saveStep(
      at(0),
      step({ attempt: 'y' }, false),
      options({ allowResubmissions: true }),
    )
    expect(await rows()).toMatchObject([{ state: { attempt: 'x' }, correct: true }])
  })

  test('refuses to save without a logged-in user', async () => {
    as(null)
    expect(remote.saveStep(at(0), step({}), options())).rejects.toThrow()
    expect(await rows()).toEqual([])
  })
})

describe('reading answers', () => {
  test('each student reads only their own answers', async () => {
    await remote.saveStep(at(0), step({ attempt: 'mine' }, true), options())
    as(other)
    await remote.saveStep(at(0), step({ attempt: 'theirs' }, false), options())
    expect((await remote.fetchSequence(sequence))![0]![0]).toMatchObject({
      state: { attempt: 'theirs' },
    })
    expect(await remote.getProgress(sequence)).toEqual({ 0: false })
    as(student)
    expect((await remote.fetchSequence(sequence))![0]![0]).toMatchObject({
      state: { attempt: 'mine' },
    })
    expect(await remote.getProgress(sequence)).toEqual({ 0: true })
  })

  test('answers are kept apart by page and by sequence', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, true), options())
    expect(await remote.fetchSequence({ ...sequence, url: '/other' })).toEqual({})
    expect(await remote.fetchSequence({ ...sequence, sequenceId: 'other' })).toEqual({})
  })

  test('nothing is read without a logged-in user', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, true), options())
    as(null)
    expect(await remote.fetchSequence(sequence)).toBeNull()
    expect(await remote.getProgress(sequence)).toBeNull()
  })

  test('progress: an exercise fails with any wrong step, and counts once every step is graded', async () => {
    await remote.saveStep(at(0), step({}, true), options())
    await remote.saveStep(at(0, 1), step({}, true), options())
    await remote.saveStep(at(1), step({}, true), options())
    await remote.saveStep(at(1, 1), step({}, false), options())
    await remote.saveStep(at(2), step({}, true), options())
    await remote.saveStep(at(2, 1), step({}), options())
    await remote.saveStep(at(3), step({}), options())
    expect(await remote.getProgress(sequence)).toEqual({ 0: true, 1: false })
  })
})

describe('reset', () => {
  test('starts the exercise again with the same question, and forgets the conversation', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, false), options())
    await remote.saveStep(at(0, 1), step({ root: '1' }, true), options())
    await remote.saveStep(at(1), step({ attempt: 'z' }, true), options())

    const { position: _, ...exercise } = at(0)
    await remote.reset(exercise, options())
    expect(await rows()).toMatchObject([
      {
        ...at(0),
        data: { expr: 'x^2 - 1' },
        state: { attempt: 'x' },
        submitted: false,
        correct: null,
      },
      { ...at(1), correct: true },
    ])
    expect(await remote.getProgress(sequence)).toEqual({ 1: true })
  })

  test('with softDelete, the previous attempt is kept, marked deleted', async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, false), options())
    const { position: _, ...exercise } = at(0)
    await remote.reset(exercise, options({ softDelete: true }))
    expect(await rows()).toMatchObject([
      { correct: false, deleted: true },
      { correct: null, submitted: false, deleted: false },
    ])
    // The fresh attempt can be answered again.
    await remote.saveStep(at(0), step({ attempt: 'y' }, true), options())
    expect((await remote.fetchSequence(sequence))![0]![0]).toMatchObject({
      state: { attempt: 'y' },
      correct: true,
    })
  })

  test('fails, changing nothing, when the exercise was never opened', async () => {
    await remote.saveStep(at(1), step({ attempt: 'z' }, true), options())
    const { position: _, ...exercise } = at(0)
    expect(remote.reset(exercise, options())).rejects.toThrow('Initial step not found')
    expect(await rows()).toHaveLength(1)
  })

  test("only resets the user's own exercise", async () => {
    await remote.saveStep(at(0), step({ attempt: 'x' }, false), options())
    as(other)
    await remote.saveStep(at(0), step({ attempt: 'y' }, false), options())
    const { position: _, ...exercise } = at(0)
    await remote.reset(exercise, options())
    const [alice, bob] = await rows()
    expect(alice).toMatchObject({ userEmail: student.email, correct: false })
    expect(bob).toMatchObject({ userEmail: other.email, correct: null })
  })
})

describe('statistics', () => {
  const answer = async (who: typeof student, sequencePosition: number, correct?: boolean) => {
    as(who)
    await remote.saveStep(at(sequencePosition), step({}, correct), options())
  }

  test('students may not read them', async () => {
    expect(remote.getStats(sequence)).rejects.toBeDefined()
    expect(remote.watchStats!({ ...sequence, sequencePosition: 0 }).next()).rejects.toBeDefined()
  })

  test("getStats lists each student's results by exercise, by name", async () => {
    await answer(other, 0, true)
    await answer(student, 0, false)
    await answer(student, 1)
    as(teacher)
    expect(await remote.getStats(sequence)).toEqual([
      {
        email: student.email,
        name: 'Alice',
        progress: [
          { i: 0, correct: false },
          { i: 1, correct: null },
        ],
      },
      { email: other.email, name: 'Bob', progress: [{ i: 0, correct: true }] },
    ])
  })

  test('watchStats gives the results of an exercise, then again whenever an answer is saved', async () => {
    await answer(student, 0, false)
    as(teacher)
    const controller = new AbortController()
    signal = controller.signal
    const watch = remote.watchStats!({ ...sequence, sequencePosition: 0 })[Symbol.asyncIterator]()
    expect((await watch.next()).value).toEqual({
      students: [{ email: student.email, name: 'Alice', correct: false, submitted: true }],
    })

    const next = watch.next()
    await answer(other, 0)
    expect((await next).value).toEqual({
      students: [
        { email: student.email, name: 'Alice', correct: false, submitted: true },
        { email: other.email, name: 'Bob', correct: null, submitted: false },
      ],
    })

    const ended = watch.next()
    controller.abort()
    expect((await ended).done).toBe(true)
  })

  test('deleted answers are left out', async () => {
    await answer(student, 0, false)
    await database.db
      .update(tables.steps)
      .set({ deleted: true })
      .where(eq(tables.steps.userEmail, student.email))
    as(teacher)
    expect(await remote.getStats(sequence)).toEqual([])
  })
})
