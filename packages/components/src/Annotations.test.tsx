import { fireEvent, render, waitFor } from '@solidjs/testing-library'
import { describe, expect, mock, test } from 'bun:test'
import type { RevealApi } from 'reveal.js'
import { flush } from 'solid-js'
import type { AnnotationBackend, DeckAnnotations, SessionEvent, Stroke } from './Annotations'

mock.module('@solidjs/router', () => ({
  useLocation: () => ({ pathname: '/slides' }),
}))

const { Deck } = await import('./Deck')
const { AnnotationsContext, touches } = await import('./Annotations')

/** An async iterable that yields what is pushed to it. */
function channel<T>() {
  const queue: T[] = []
  let wake = () => {}
  return {
    push(value: T) {
      queue.push(value)
      wake()
    },
    async *[Symbol.asyncIterator]() {
      for (;;) {
        if (queue.length === 0) await new Promise<void>((resolve) => (wake = resolve))
        yield queue.shift()!
      }
    },
  }
}

const session = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Groupe A',
  created: '2026-12-03T09:00:00.000Z',
}

function fakeBackend(state: Omit<DeckAnnotations, 'email'> & { email?: string | null }) {
  const deck = channel<DeckAnnotations>()
  const events = channel<SessionEvent>()
  deck.push({ email: null, ...state })
  const backend = {
    watchDeck: mock(() => deck),
    watchSession: mock(() => events),
    createSession: mock(async () => session.id),
    setLive: mock(async () => {}),
    setSlide: mock(async () => {}),
    drawing: mock(async () => {}),
    addStroke: mock(async () => {}),
    removeStrokes: mock(async () => {}),
    restoreStrokes: mock(async () => {}),
  } satisfies AnnotationBackend
  return { backend, deck, events }
}

const stroke = (id: string, points: Stroke['points'], slide = '0.0'): Stroke => ({
  id,
  slide,
  tool: 'pen',
  color: '#23373b',
  width: 6,
  points,
})

async function renderDeck(backend: AnnotationBackend) {
  let deck: RevealApi | undefined
  const result = render(() => (
    <AnnotationsContext value={backend}>
      <Deck annotators="prof@ecam.be" onReady={(d) => (deck = d)}>
        <Deck.Slide title="Un">Premier</Deck.Slide>
        <Deck.Slide title="Deux">Second</Deck.Slide>
      </Deck>
    </AnnotationsContext>
  ))
  await waitFor(() => expect(deck).toBeDefined(), { timeout: 5000 })
  const svg = () => result.container.querySelector<SVGSVGElement>('svg[data-annotations]')
  await waitFor(() => expect(svg()).not.toBeNull())
  // happy-dom lays nothing out: the slide fills 1280 by 720 pixels from the origin.
  svg()!.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 }) as DOMRect
  const captured = new Set<number>()
  svg()!.setPointerCapture = (id) => captured.add(id)
  svg()!.releasePointerCapture = (id) => captured.delete(id)
  svg()!.hasPointerCapture = (id) => captured.has(id)
  const paths = () => svg()!.querySelectorAll('path').length
  return { ...result, deck: deck!, svg: () => svg()!, paths }
}

const draw = (svg: SVGSVGElement, points: [number, number][]) => {
  const at = ([clientX, clientY]: [number, number]) => ({
    clientX,
    clientY,
    pointerId: 1,
    isPrimary: true,
    pointerType: 'mouse',
  })
  fireEvent.pointerDown(svg, at(points[0]!))
  flush()
  for (const point of points.slice(1)) fireEvent.pointerMove(svg, at(point))
  fireEvent.pointerUp(svg, at(points.at(-1)!))
}

describe('Annotations', () => {
  test("shows students the live session's strokes as they come, without tools", async () => {
    const { backend, events } = fakeBackend({
      canDraw: false,
      sessions: [{ ...session, presenter: 'prof@ecam.be' }],
    })
    const { getByText, queryByLabelText, paths } = await renderDeck(backend)
    await waitFor(() => expect(backend.watchSession).toHaveBeenCalledWith(session.id))
    events.push({
      type: 'snapshot',
      strokes: [
        stroke('a', [
          [10, 10, 0.5],
          [50, 50, 0.5],
        ]),
      ],
      presenter: 'prof@ecam.be',
      slide: null,
    })
    await waitFor(() => expect(paths()).toBe(1))
    events.push({
      type: 'progress',
      stroke: stroke('b', [
        [100, 100, 0.5],
        [120, 90, 0.5],
      ]),
    })
    await waitFor(() => expect(paths()).toBe(2))
    events.push({
      type: 'add',
      stroke: stroke('b', [
        [100, 100, 0.5],
        [120, 90, 0.5],
        [130, 80, 0.5],
      ]),
    })
    events.push({ type: 'add', stroke: stroke('c', [[10, 10, 0.5]], '1.0') })
    await waitFor(() => expect(paths()).toBe(2))
    events.push({ type: 'remove', ids: ['a'] })
    await waitFor(() => expect(paths()).toBe(1))
    expect(getByText('Groupe A')).toBeTruthy()
    expect(queryByLabelText('Stylo')).toBeNull()
  })

  test("follows the presenter's slide, unless told not to", async () => {
    const { backend, events } = fakeBackend({
      canDraw: false,
      sessions: [{ ...session, presenter: 'prof@ecam.be' }],
    })
    const { deck, getByText, getByLabelText } = await renderDeck(backend)
    await waitFor(() => expect(backend.watchSession).toHaveBeenCalled())
    events.push({ type: 'snapshot', strokes: [], presenter: 'prof@ecam.be', slide: { h: 1, v: 0 } })
    await waitFor(() => expect(deck.getIndices().h).toBe(1))
    fireEvent.click(getByText('Groupe A'))
    flush()
    fireEvent.click(getByLabelText('Suivre la présentation'))
    flush()
    events.push({ type: 'slide', slide: { h: 0, v: 0 } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(deck.getIndices().h).toBe(1)
  })

  test('starts a live session for an annotator who picks a tool, and saves what they draw', async () => {
    const {
      backend,
      deck: deckState,
      events,
    } = fakeBackend({
      canDraw: true,
      email: 'prof@ecam.be',
      sessions: [],
    })
    const { getByLabelText, svg, paths } = await renderDeck(backend)
    fireEvent.click(getByLabelText('Stylo'))
    flush()
    await waitFor(() => expect(backend.setLive).toHaveBeenCalled())
    expect(backend.createSession).toHaveBeenCalledWith(
      { url: '/slides', deck: '' },
      expect.stringMatching(/^Séance du /),
    )
    expect((backend.setLive.mock.calls[0] as unknown[]).slice(0, 2)).toEqual([session.id, true])
    deckState.push({
      canDraw: true,
      email: 'prof@ecam.be',
      sessions: [{ ...session, presenter: 'prof@ecam.be' }],
    })
    await waitFor(() => expect(backend.watchSession).toHaveBeenCalledWith(session.id))
    events.push({ type: 'snapshot', strokes: [], presenter: 'prof@ecam.be', slide: null })

    draw(svg(), [
      [100, 100],
      [200, 150],
      [300, 120],
    ])
    await waitFor(() => expect(paths()).toBe(1))
    await waitFor(() => expect(backend.addStroke).toHaveBeenCalled())
    const [id, saved] = backend.addStroke.mock.calls[0]! as unknown as [string, Stroke]
    expect(id).toBe(session.id)
    expect(saved).toMatchObject({ slide: '0.0', tool: 'pen', color: '#23373b', width: 6 })
    expect(saved.points.map(([x, y]) => [x, y])).toEqual([
      [100, 100],
      [200, 150],
      [300, 120],
    ])

    fireEvent.click(getByLabelText('Annuler'))
    await waitFor(() => expect(paths()).toBe(0))
    await waitFor(() => expect(backend.removeStrokes).toHaveBeenCalledWith(session.id, [saved.id]))
    fireEvent.click(getByLabelText('Rétablir'))
    await waitFor(() => expect(paths()).toBe(1))
    await waitFor(() => expect(backend.restoreStrokes).toHaveBeenCalledWith(session.id, [saved.id]))

    fireEvent.click(getByLabelText('Gomme'))
    flush()
    draw(svg(), [
      [500, 500],
      [205, 148],
    ])
    await waitFor(() => expect(paths()).toBe(0))
    await waitFor(() => expect(backend.removeStrokes).toHaveBeenCalledTimes(2))
  })

  test('takes back a stroke that could not be saved, and the undo it allowed', async () => {
    const { backend, events } = fakeBackend({
      canDraw: true,
      email: 'prof@ecam.be',
      sessions: [{ ...session, presenter: 'prof@ecam.be' }],
    })
    backend.addStroke.mockImplementation(async () => {
      throw new Error('hors ligne')
    })
    const error = console.error
    console.error = () => {}
    try {
      const { getByLabelText, svg, paths } = await renderDeck(backend)
      await waitFor(() => expect(backend.watchSession).toHaveBeenCalled())
      events.push({ type: 'snapshot', strokes: [], presenter: 'prof@ecam.be', slide: null })
      fireEvent.click(getByLabelText('Stylo'))
      flush()
      draw(svg(), [
        [100, 100],
        [200, 150],
      ])
      await waitFor(() => expect(backend.addStroke).toHaveBeenCalled())
      await waitFor(() => expect(paths()).toBe(0))
      await waitFor(() => expect(getByLabelText('Annuler')).toBeDisabled())
    } finally {
      console.error = error
    }
  })

  test('ignores progress that arrives late, after the stroke or an older one', async () => {
    const { backend, events } = fakeBackend({
      canDraw: false,
      sessions: [{ ...session, presenter: 'prof@ecam.be' }],
    })
    const { svg, paths } = await renderDeck(backend)
    await waitFor(() => expect(backend.watchSession).toHaveBeenCalled())
    const long = stroke('a', [
      [10, 10, 0.5],
      [50, 50, 0.5],
      [90, 20, 0.5],
    ])
    events.push({ type: 'snapshot', strokes: [], presenter: 'prof@ecam.be', slide: null })
    events.push({ type: 'progress', stroke: long })
    events.push({ type: 'progress', stroke: { ...long, points: long.points.slice(0, 2) } })
    await waitFor(() => expect(paths()).toBe(1))
    const shown = svg().querySelector('path')!.getAttribute('d')
    events.push({ type: 'add', stroke: long })
    events.push({ type: 'progress', stroke: { ...long, points: long.points.slice(0, 2) } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(paths()).toBe(1)
    expect(svg().querySelector('path')!.getAttribute('d')).toBe(shown)
  })

  test('erases the strokes the eraser touches', () => {
    const line = stroke('a', [
      [0, 0, 0.5],
      [100, 0, 0.5],
    ])
    expect(touches(line, [50, 12, 0.5])).toBe(true)
    expect(touches(line, [50, 20, 0.5])).toBe(false)
    expect(touches(line, [-12, 0, 0.5])).toBe(true)
  })
})
