import type {
  AnnotationBackend,
  AnnotationSession,
  DeckAnnotations,
  SessionEvent,
  Stroke,
} from '@learning/components'
import { db, tables } from '@learning/db'
import { getRequestEvent, respond } from '@solidjs/web'
import { live } from '@solidjs/web/server-functions'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import * as v from 'valibot'
import { annotatorsOf } from './pageSources'
import { getRole } from './permissions'

const DeckKey = v.object({ url: v.pipe(v.string(), v.maxLength(500)), deck: v.string() })
type DeckKey = v.InferOutput<typeof DeckKey>

const SessionId = v.pipe(v.string(), v.uuid())

const StrokeSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  slide: v.pipe(v.string(), v.regex(/^\d+\.\d+$/)),
  tool: v.picklist(['pen', 'highlighter']),
  color: v.pipe(v.string(), v.hexColor()),
  width: v.pipe(v.number(), v.minValue(0.5), v.maxValue(100)),
  points: v.pipe(
    v.array(v.tuple([v.number(), v.number(), v.pipe(v.number(), v.minValue(0), v.maxValue(1))])),
    v.minLength(1),
    v.maxLength(10_000),
  ),
})

const Slide = v.object({
  h: v.pipe(v.number(), v.integer(), v.minValue(0)),
  v: v.pipe(v.number(), v.integer(), v.minValue(0)),
  f: v.optional(v.pipe(v.number(), v.integer())),
})

/**
 * In-process messages, enough for the single Bun server, as for answers in context.remote.ts.
 * Several server instances would need Postgres LISTEN/NOTIFY instead.
 */
const bus = new EventTarget()
const deckTopic = (key: DeckKey) => `deck:${JSON.stringify([key.url, key.deck])}`
const sessionTopic = (id: string) => `session:${id}`
const publish = (topic: string, detail?: unknown) =>
  bus.dispatchEvent(new CustomEvent(topic, { detail }))

/**
 * Every message of a topic, in order, from the call on and until `signal` aborts.
 * It listens at once, so that nothing published while the caller reads the current state is lost.
 */
function subscribe<T>(topic: string, signal?: AbortSignal): AsyncIterable<T> {
  const queue: T[] = []
  let wake = () => {}
  const listener = (event: Event) => {
    queue.push((event as CustomEvent<T>).detail)
    wake()
  }
  bus.addEventListener(topic, listener)
  // An async generator's return() waits for its pending await, so a disconnect must wake it.
  signal?.addEventListener('abort', () => wake())
  return (async function* () {
    try {
      while (!signal?.aborted) {
        if (queue.length === 0) await new Promise<void>((resolve) => (wake = resolve))
        while (queue.length > 0 && !signal?.aborted) yield queue.shift()!
      }
    } finally {
      bus.removeEventListener(topic, listener)
    }
  })()
}

function currentUser() {
  return getRequestEvent()?.locals.user ?? null
}

async function canDrawOn(key: DeckKey) {
  const user = currentUser()
  if (!user) return false
  if ((await getRole()) === 'admin') return true
  return (await annotatorsOf(key.url, key.deck)).includes(user.email.toLowerCase())
}

const sessionDecks = new Map<string, DeckKey>()

async function deckOf(sessionId: string): Promise<DeckKey> {
  const known = sessionDecks.get(sessionId)
  if (known) return known
  const [session] = await db
    .select({ url: tables.annotationSessions.url, deck: tables.annotationSessions.deck })
    .from(tables.annotationSessions)
    .where(eq(tables.annotationSessions.id, sessionId))
  if (!session) throw respond({ error: 'Séance introuvable' }, { status: 404 })
  sessionDecks.set(sessionId, session)
  return session
}

/** The email of the user, who must be allowed to draw on the session's deck. */
async function ensureAnnotator(sessionId: string) {
  const deck = await deckOf(sessionId)
  if (!(await canDrawOn(deck))) {
    throw respond({ error: 'Vous ne pouvez pas dessiner sur cette présentation' }, { status: 403 })
  }
  return { email: currentUser()!.email, deck }
}

async function sessionsOf(key: DeckKey): Promise<AnnotationSession[]> {
  const rows = await db
    .select({
      id: tables.annotationSessions.id,
      name: tables.annotationSessions.name,
      created: tables.annotationSessions.created,
      presenter: tables.annotationSessions.presenter,
    })
    .from(tables.annotationSessions)
    .where(
      and(eq(tables.annotationSessions.url, key.url), eq(tables.annotationSessions.deck, key.deck)),
    )
    .orderBy(desc(tables.annotationSessions.created))
  return rows.map((row) => ({ ...row, created: row.created.toISOString() }))
}

export const watchDeck = live(async function* (rawKey: DeckKey) {
  'use server'
  const key = v.parse(DeckKey, rawKey)
  const changes = subscribe(deckTopic(key), getRequestEvent()?.request.signal)
  const state = async (): Promise<DeckAnnotations> => ({
    canDraw: await canDrawOn(key),
    email: currentUser()?.email ?? null,
    sessions: await sessionsOf(key),
  })
  yield await state()
  for await (const _ of changes) yield await state()
})

export const watchSession = live(async function* (rawId: string) {
  'use server'
  const id = v.parse(SessionId, rawId)
  const events = subscribe<SessionEvent>(sessionTopic(id), getRequestEvent()?.request.signal)
  const [session] = await db
    .select({
      presenter: tables.annotationSessions.presenter,
      slide: tables.annotationSessions.slide,
    })
    .from(tables.annotationSessions)
    .where(eq(tables.annotationSessions.id, id))
  if (!session) throw respond({ error: 'Séance introuvable' }, { status: 404 })
  const strokes = await db
    .select({
      id: tables.strokes.id,
      slide: tables.strokes.slide,
      tool: tables.strokes.tool,
      color: tables.strokes.color,
      width: tables.strokes.width,
      points: tables.strokes.points,
    })
    .from(tables.strokes)
    .where(and(eq(tables.strokes.sessionId, id), eq(tables.strokes.deleted, false)))
    .orderBy(tables.strokes.created)
  yield {
    type: 'snapshot',
    strokes: strokes as Stroke[],
    presenter: session.presenter,
    slide: (session.slide ?? null) as v.InferOutput<typeof Slide> | null,
  } satisfies SessionEvent
  yield* events
})

export async function createSession(rawKey: DeckKey, rawName: string) {
  'use server'
  const key = v.parse(DeckKey, rawKey)
  const name = v.parse(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)), rawName)
  if (!(await canDrawOn(key))) {
    throw respond({ error: 'Vous ne pouvez pas dessiner sur cette présentation' }, { status: 403 })
  }
  const email = currentUser()!.email
  const [session] = await db
    .insert(tables.annotationSessions)
    .values({ ...key, name, createdBy: email })
    .returning({ id: tables.annotationSessions.id })
  publish(deckTopic(key))
  return session!.id
}

/** Starts presenting a session live, which ends any other live session of the deck, or stops. */
export async function setLive(rawId: string, isLive: boolean, rawSlide?: unknown) {
  'use server'
  const id = v.parse(SessionId, rawId)
  const slide = rawSlide === undefined ? undefined : v.parse(Slide, rawSlide)
  const { email, deck } = await ensureAnnotator(id)
  const ended = await db.transaction(async (tx) => {
    // Locks the deck's sessions: without it, two transactions that both find none live would both go live.
    await tx
      .select({ id: tables.annotationSessions.id })
      .from(tables.annotationSessions)
      .where(
        and(
          eq(tables.annotationSessions.url, deck.url),
          eq(tables.annotationSessions.deck, deck.deck),
        ),
      )
      .for('update')
    const ended = isLive
      ? await tx
          .update(tables.annotationSessions)
          .set({ presenter: null })
          .where(
            and(
              eq(tables.annotationSessions.url, deck.url),
              eq(tables.annotationSessions.deck, deck.deck),
              isNotNull(tables.annotationSessions.presenter),
            ),
          )
          .returning({ id: tables.annotationSessions.id })
      : []
    await tx
      .update(tables.annotationSessions)
      .set({ presenter: isLive ? email : null, ...(slide ? { slide } : {}) })
      .where(eq(tables.annotationSessions.id, id))
    return ended
  })
  for (const other of ended) {
    if (other.id !== id) publish(sessionTopic(other.id), { type: 'presenter', presenter: null })
  }
  publish(sessionTopic(id), { type: 'presenter', presenter: isLive ? email : null })
  if (slide) publish(sessionTopic(id), { type: 'slide', slide })
  publish(deckTopic(deck))
}

export async function setSlide(rawId: string, rawSlide: unknown) {
  'use server'
  const id = v.parse(SessionId, rawId)
  const slide = v.parse(Slide, rawSlide)
  const { email } = await ensureAnnotator(id)
  const [updated] = await db
    .update(tables.annotationSessions)
    .set({ slide })
    .where(
      and(eq(tables.annotationSessions.id, id), eq(tables.annotationSessions.presenter, email)),
    )
    .returning({ id: tables.annotationSessions.id })
  if (updated) publish(sessionTopic(id), { type: 'slide', slide })
}

/** Shows a stroke being drawn, without saving it. */
export async function drawing(rawId: string, rawStroke: Stroke) {
  'use server'
  const id = v.parse(SessionId, rawId)
  const stroke = v.parse(StrokeSchema, rawStroke)
  await ensureAnnotator(id)
  publish(sessionTopic(id), { type: 'progress', stroke })
}

export async function addStroke(rawId: string, rawStroke: Stroke) {
  'use server'
  const id = v.parse(SessionId, rawId)
  const stroke = v.parse(StrokeSchema, rawStroke)
  const { email } = await ensureAnnotator(id)
  await db
    .insert(tables.strokes)
    .values({ ...stroke, sessionId: id, userEmail: email })
    .onConflictDoNothing()
  publish(sessionTopic(id), { type: 'add', stroke })
}

export async function removeStrokes(rawId: string, rawIds: string[]) {
  'use server'
  const id = v.parse(SessionId, rawId)
  const ids = v.parse(v.pipe(v.array(v.pipe(v.string(), v.uuid())), v.maxLength(10_000)), rawIds)
  await ensureAnnotator(id)
  if (ids.length === 0) return
  await db
    .update(tables.strokes)
    .set({ deleted: true })
    .where(and(eq(tables.strokes.sessionId, id), inArray(tables.strokes.id, ids)))
  publish(sessionTopic(id), { type: 'remove', ids })
}

/** Brings back erased strokes, to undo erasing them. */
export async function restoreStrokes(rawId: string, rawIds: string[]) {
  'use server'
  const id = v.parse(SessionId, rawId)
  const ids = v.parse(v.pipe(v.array(v.pipe(v.string(), v.uuid())), v.maxLength(10_000)), rawIds)
  await ensureAnnotator(id)
  if (ids.length === 0) return
  const strokes = await db
    .update(tables.strokes)
    .set({ deleted: false })
    .where(and(eq(tables.strokes.sessionId, id), inArray(tables.strokes.id, ids)))
    .returning({
      id: tables.strokes.id,
      slide: tables.strokes.slide,
      tool: tables.strokes.tool,
      color: tables.strokes.color,
      width: tables.strokes.width,
      points: tables.strokes.points,
    })
  publish(sessionTopic(id), { type: 'restore', strokes: strokes as Stroke[] })
}

export const annotations: AnnotationBackend = {
  watchDeck,
  watchSession,
  createSession,
  setLive,
  setSlide,
  drawing,
  addStroke,
  removeStrokes,
  restoreStrokes,
}
