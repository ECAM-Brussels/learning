import * as tables from '@learning/db/schema'
import { createTestDatabase } from '@learning/db/testing'
import * as web from '@solidjs/web'
import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'

const database = await createTestDatabase()

let user: { email: string; name: string } | null = null
let signal: AbortSignal | undefined

mock.module('@learning/db', () => ({ db: database.db, tables }))
mock.module('@solidjs/web', () => ({
  ...web,
  getRequestEvent: () => ({ locals: { user }, request: { signal } }),
}))
mock.module('@solidjs/web/server-functions', () => ({ live: <T>(fn: T) => fn }))
mock.module('virtual:solid-env/server', () => ({ env: { ADMINS: ['admin@example.com'] } }))

const remote = await import('./annotations.remote')
const { registerPageSources } = await import('./pageSources')

const presenter = { email: 'prof@ecam.be', name: 'Prof' }
const assistant = { email: 'assistant@ecam.be', name: 'Assistant' }
const colleague = { email: 'other@ecam.be', name: 'Colleague' }
const student = { email: 'alice@student.ecam.be', name: 'Alice' }
const admin = { email: 'admin@example.com', name: 'Admin' }

// Who may draw is read from the page's source, never from what the browser sends.
registerPageSources(
  {
    'deck.mdx': async () =>
      ':::::deck[title="Dérivées" annotators="Prof@ecam.be, assistant@ecam.be"]\n\n# Slide\n\n:::::\n',
  },
  () => '/deck',
)
const deck = { url: '/deck', deck: '' }

const stroke = (overrides: Partial<{ id: string; slide: string }> = {}) => ({
  id: randomUUID(),
  slide: '0.0',
  tool: 'pen' as const,
  color: '#ff0000',
  width: 3,
  points: [[10, 20, 0.5] as [number, number, number]],
  ...overrides,
})

/** The HTTP status a server function refused with, or 'ok'. */
const outcome = (call: Promise<unknown>) =>
  call.then(
    () => 'ok',
    (error) => (error instanceof Response ? error.status : String(error)),
  )

const as = (who: typeof user) => {
  user = who
}

/** The first event of a session's stream: its strokes and presenter when opened. */
async function snapshot(id: string) {
  const controller = new AbortController()
  signal = controller.signal
  const events = remote.watchSession(id)[Symbol.asyncIterator]()
  const first = (await events.next()).value
  controller.abort()
  signal = undefined
  return first as {
    strokes: ({ id: string } & Record<string, unknown>)[]
    presenter: string | null
    slide: unknown
  }
}

beforeEach(async () => {
  await database.clear()
  for (const someone of [presenter, assistant, colleague, student, admin]) {
    await database.addUser(someone.email, someone.name)
  }
  as(presenter)
  signal = undefined
})

afterAll(() => database.close())

describe('who may draw', () => {
  test('the annotators of the page, case aside, and admins, may open a session', async () => {
    for (const someone of [presenter, assistant, admin]) {
      as(someone)
      expect(await outcome(remote.createSession(deck, `Séance de ${someone.name}`))).toBe('ok')
    }
    expect(await database.db.select().from(tables.annotationSessions)).toHaveLength(3)
  })

  test('nobody else may open a session, nor draw on one, even knowing its id', async () => {
    const id = await remote.createSession(deck, 'Groupe A')
    const line = stroke()
    await remote.addStroke(id, line)
    for (const someone of [colleague, student, null]) {
      as(someone)
      expect(await outcome(remote.createSession(deck, 'Pirate'))).toBe(403)
      expect(await outcome(remote.addStroke(id, stroke()))).toBe(403)
      expect(await outcome(remote.drawing(id, stroke()))).toBe(403)
      expect(await outcome(remote.removeStrokes(id, [line.id]))).toBe(403)
      expect(await outcome(remote.setLive(id, true))).toBe(403)
    }
    expect(await database.db.select().from(tables.annotationSessions)).toHaveLength(1)
    expect(await database.db.select().from(tables.strokes)).toMatchObject([
      { id: line.id, deleted: false },
    ])
  })

  test("a deck the page doesn't list for drawing can't be drawn on", async () => {
    expect(await outcome(remote.createSession({ url: '/deck', deck: 'other' }, 'Groupe'))).toBe(403)
    expect(await outcome(remote.createSession({ url: '/elsewhere', deck: '' }, 'Groupe'))).toBe(403)
  })

  test('an unknown session is refused', async () => {
    expect(await outcome(remote.addStroke(randomUUID(), stroke()))).toBe(404)
  })

  test('watchDeck tells each viewer whether they may draw, and lists the sessions', async () => {
    const controller = new AbortController()
    signal = controller.signal
    as(student)
    const watch = remote.watchDeck(deck)[Symbol.asyncIterator]()
    expect((await watch.next()).value).toEqual({
      canDraw: false,
      email: student.email,
      sessions: [],
    })
    const next = watch.next()
    as(presenter)
    const id = await remote.createSession(deck, 'Groupe A')
    as(student)
    expect((await next).value).toMatchObject({
      canDraw: false,
      sessions: [{ id, name: 'Groupe A', presenter: null }],
    })
    controller.abort()
  })
})

describe('strokes', () => {
  test('are saved, and given to whoever opens the session', async () => {
    const id = await remote.createSession(deck, 'Groupe A')
    const line = stroke()
    await remote.addStroke(id, line)
    // Sent again, e.g. after a lost response: saved once.
    await remote.addStroke(id, line)
    expect(await database.db.select().from(tables.strokes)).toMatchObject([
      { id: line.id, sessionId: id, userEmail: presenter.email, points: [[10, 20, 0.5]] },
    ])
    as(student)
    expect((await snapshot(id)).strokes).toEqual([
      {
        id: line.id,
        slide: '0.0',
        tool: 'pen',
        color: '#ff0000',
        width: 3,
        points: [[10, 20, 0.5]],
      },
    ])
  })

  test('erased strokes are kept, so that undo can bring them back', async () => {
    const id = await remote.createSession(deck, 'Groupe A')
    const [kept, erased] = [stroke(), stroke()]
    await remote.addStroke(id, kept)
    await remote.addStroke(id, erased)
    await remote.removeStrokes(id, [erased.id])
    expect((await snapshot(id)).strokes.map((s) => s.id)).toEqual([kept.id])
    await remote.restoreStrokes(id, [erased.id])
    expect((await snapshot(id)).strokes.map((s) => s.id)).toEqual([kept.id, erased.id])
  })

  test("erasing in one session leaves another session's strokes alone", async () => {
    const [a, b] = [await remote.createSession(deck, 'A'), await remote.createSession(deck, 'B')]
    const line = stroke()
    await remote.addStroke(b, line)
    await remote.removeStrokes(a, [line.id])
    expect((await snapshot(b)).strokes.map((s) => s.id)).toEqual([line.id])
  })

  test('malformed strokes are refused', async () => {
    const id = await remote.createSession(deck, 'Groupe A')
    for (const bad of [
      { ...stroke(), color: 'red' },
      { ...stroke(), slide: '../0' },
      { ...stroke(), points: [] },
      { ...stroke(), width: 1000 },
      { ...stroke(), id: 'not-a-uuid' },
    ]) {
      expect(await outcome(remote.addStroke(id, bad))).not.toBe('ok')
    }
    expect(await database.db.select().from(tables.strokes)).toEqual([])
  })
})

describe('presenting live', () => {
  test('one session of a deck is live at a time', async () => {
    const [a, b] = [await remote.createSession(deck, 'A'), await remote.createSession(deck, 'B')]
    await remote.setLive(a, true, { h: 2, v: 0 })
    expect(await snapshot(a)).toMatchObject({ presenter: presenter.email, slide: { h: 2, v: 0 } })

    const controller = new AbortController()
    signal = controller.signal
    const events = remote.watchSession(a)[Symbol.asyncIterator]()
    await events.next()
    signal = undefined
    as(assistant)
    await remote.setLive(b, true)
    expect((await events.next()).value).toEqual({ type: 'presenter', presenter: null })
    controller.abort()

    expect((await snapshot(a)).presenter).toBeNull()
    expect((await snapshot(b)).presenter).toBe(assistant.email)
  })

  test('only the presenter moves the slide that students follow', async () => {
    const id = await remote.createSession(deck, 'A')
    await remote.setLive(id, true, { h: 0, v: 0 })
    as(assistant)
    await remote.setSlide(id, { h: 5, v: 1 })
    expect((await snapshot(id)).slide).toEqual({ h: 0, v: 0 })
    as(presenter)
    await remote.setSlide(id, { h: 3, v: 0, f: 1 })
    expect((await snapshot(id)).slide).toEqual({ h: 3, v: 0, f: 1 })
  })

  test('stopping keeps the strokes, and leaves no presenter', async () => {
    const id = await remote.createSession(deck, 'A')
    await remote.setLive(id, true)
    await remote.addStroke(id, stroke())
    await remote.setLive(id, false)
    expect(await snapshot(id)).toMatchObject({ presenter: null, strokes: [{}] })
  })
})
