import {
  faChevronDown,
  faEraser,
  faHighlighter,
  faPen,
  faRotateLeft,
  faRotateRight,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons'
import { useLocation } from '@solidjs/router'
import type { JSX } from '@solidjs/web'
import { getStroke } from 'perfect-freehand'
import type { RevealApi } from 'reveal.js'
import {
  action,
  createContext,
  createEffect,
  createMemo,
  createOptimistic,
  createOptimisticStore,
  createSignal,
  createStore,
  Errored,
  flush,
  For,
  Loading,
  onSettled,
  Show,
  untrack,
  useContext,
} from 'solid-js'
import { Fa } from './Fa'
import { useLang } from './Meta'

export type Point = [x: number, y: number, pressure: number]

/** A line drawn on a slide, in a 1280 by 720 frame over the slide, whatever the deck's size. */
export type Stroke = {
  id: string
  /** The slide's reveal.js indices, `h.v`. */
  slide: string
  tool: 'pen' | 'highlighter'
  color: string
  width: number
  points: Point[]
}

export type SlidePosition = { h: number; v: number; f?: number }

/** A time a deck was presented and drawn on, such as one group's lecture. */
export type AnnotationSession = {
  id: string
  name: string
  created: string
  /** Who presents it while it is live, null once it has ended. */
  presenter: string | null
}

export type DeckAnnotations = {
  canDraw: boolean
  email: string | null
  sessions: AnnotationSession[]
}

export type SessionEvent =
  | { type: 'snapshot'; strokes: Stroke[]; presenter: string | null; slide: SlidePosition | null }
  | { type: 'add' | 'progress'; stroke: Stroke }
  | { type: 'remove'; ids: string[] }
  | { type: 'restore'; strokes: Stroke[] }
  | { type: 'slide'; slide: SlidePosition }
  | { type: 'presenter'; presenter: string | null }

export type DeckKey = { url: string; deck: string }

/** Where strokes are saved and shared: the app provides it, as `@learning/core`'s `annotations`. */
export type AnnotationBackend = {
  watchDeck: (key: DeckKey) => AsyncIterable<DeckAnnotations>
  watchSession: (id: string) => AsyncIterable<SessionEvent>
  createSession: (key: DeckKey, name: string) => Promise<string>
  setLive: (id: string, live: boolean, slide?: SlidePosition) => Promise<void>
  setSlide: (id: string, slide: SlidePosition) => Promise<void>
  drawing: (id: string, stroke: Stroke) => Promise<void>
  addStroke: (id: string, stroke: Stroke) => Promise<void>
  removeStrokes: (id: string, ids: string[]) => Promise<void>
  restoreStrokes: (id: string, ids: string[]) => Promise<void>
}

export const AnnotationsContext = createContext<AnnotationBackend | null>(null)

// Saved strokes are in this frame: keep it when the deck's size changes.
const WIDTH = 1280
const HEIGHT = 720

const colors = ['#23373b', '#e5383b', '#1d6fd1', '#2a9d4b']
const highlighter = '#ffd60a'
const widths = [3, 6, 12]

const labels = {
  fr: {
    pen: 'Stylo',
    highlighter: 'Surligneur',
    eraser: 'Gomme',
    undo: 'Annuler',
    redo: 'Rétablir',
    clear: 'Effacer la diapositive',
    color: 'Couleur',
    width: 'Épaisseur',
    sessions: 'Séances',
    none: 'Aucune annotation',
    live: 'en direct',
    newSession: 'Nouvelle séance',
    create: 'Créer',
    present: 'Présenter en direct',
    stop: 'Arrêter le direct',
    follow: 'Suivre la présentation',
    defaultName: (date: string) => `Séance du ${date}`,
  },
  en: {
    pen: 'Pen',
    highlighter: 'Highlighter',
    eraser: 'Eraser',
    undo: 'Undo',
    redo: 'Redo',
    clear: 'Clear slide',
    color: 'Colour',
    width: 'Width',
    sessions: 'Sessions',
    none: 'No annotations',
    live: 'live',
    newSession: 'New session',
    create: 'Create',
    present: 'Present live',
    stop: 'Stop presenting',
    follow: 'Follow the presenter',
    defaultName: (date: string) => `Session of ${date}`,
  },
}

const round = (x: number, digits = 1) => Math.round(x * 10 ** digits) / 10 ** digits
const slideKey = (indices: SlidePosition) => `${indices.h}.${indices.v}`
const formatDate = (date: string | Date, lang: string) =>
  new Date(date).toLocaleString(lang === 'fr' ? 'fr-BE' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

/** The outline of a pen stroke, whose width follows the stylus' pressure, as an SVG path. */
export function penPath(stroke: Stroke) {
  const outline = getStroke(stroke.points, {
    size: stroke.width,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.4,
    simulatePressure: false,
    last: true,
  })
  if (outline.length === 0) return ''
  const mid = (a: number[], b: number[]) => [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2]
  const d = outline.map((point, i) => {
    const [x, y] = mid(point, outline[(i + 1) % outline.length]!)
    return `${round(point[0]!, 2)},${round(point[1]!, 2)} ${round(x!, 2)},${round(y!, 2)}`
  })
  return `M${outline[0]![0]},${outline[0]![1]} Q${d.join(' ')} Z`
}

const linePath = (points: Point[]) =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')

function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point) {
  const dx = bx - ax
  const dy = by - ay
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Whether the eraser, at `point`, touches the stroke. */
export function touches(stroke: Stroke, point: Point, radius = 10) {
  const reach = radius + stroke.width / 2
  const { points } = stroke
  if (points.length === 1)
    return Math.hypot(point[0] - points[0]![0], point[1] - points[0]![1]) <= reach
  return points.some((p, i) => i > 0 && distanceToSegment(point, points[i - 1]!, p) <= reach)
}

function StrokeView(props: { stroke: Stroke }) {
  return (
    <Show
      when={props.stroke.tool === 'highlighter'}
      fallback={<path d={penPath(props.stroke)} fill={props.stroke.color} />}
    >
      <path
        d={linePath(props.stroke.points)}
        fill="none"
        stroke={props.stroke.color}
        stroke-width={props.stroke.width}
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity={0.4}
      />
    </Show>
  )
}

type Tool = 'pen' | 'highlighter' | 'eraser'
/** Strokes added or removed by one gesture, which undo reverses. */
type Action = { type: 'add' | 'remove'; strokes: Stroke[] }

/**
 * Strokes drawn on a deck by the people its page allows, saved by session and shown live to everyone.
 * Rendered by `Deck` when it has `annotators` and the app provides an `AnnotationsContext`.
 */
export function Annotations(props: {
  deckId: string
  deck: () => RevealApi | null
  root: () => HTMLElement | undefined
}) {
  const backend = useContext(AnnotationsContext)
  return (
    <Show when={backend}>
      <Errored
        fallback={(error) => {
          console.error(error())
          return null
        }}
      >
        <Loading fallback={null}>
          <Layer {...props} backend={backend!} />
        </Loading>
      </Errored>
    </Show>
  )
}

function Layer(props: {
  deckId: string
  deck: () => RevealApi | null
  root: () => HTMLElement | undefined
  backend: AnnotationBackend
}) {
  const backend = untrack(() => props.backend)
  const location = useLocation()
  const lang = useLang()
  const t = () => labels[lang()]
  const key = createMemo(() => ({ url: location.pathname, deck: props.deckId }))
  const state = createMemo(() => backend.watchDeck(key()), { name: 'annotatedDeck' })

  /** The session picked from the menu; undefined follows the live one, null shows none. */
  const [chosen, setChosen] = createSignal<string | null | undefined>(undefined)
  const liveSession = createMemo(() => state().sessions.find((s) => s.presenter !== null))
  const sessionId = createMemo(() => {
    const picked = chosen()
    return picked === undefined ? (liveSession()?.id ?? null) : picked
  })
  const session = createMemo(() => state().sessions.find((s) => s.id === sessionId()))

  const [view, setView] = createStore({
    strokes: {} as Record<string, Stroke>,
    /** Strokes being drawn by others, not saved yet. */
    pending: {} as Record<string, Stroke>,
    presenter: null as string | null,
    slide: null as SlidePosition | null,
  })

  createEffect(sessionId, (id) => {
    setView((s) => {
      s.strokes = {}
      s.pending = {}
      s.presenter = null
      s.slide = null
    })
    setUndo([])
    setRedo([])
    if (!id) return
    const events = backend.watchSession(id)[Symbol.asyncIterator]()
    let stopped = false
    void (async () => {
      while (!stopped) {
        const next = await events.next()
        if (stopped || next.done) break
        apply(next.value)
      }
    })().catch((error) => console.error(error))
    return () => {
      stopped = true
      void events.return?.()
    }
  })

  /**
   * Sends the presenter's slide, one request at a time and only the latest:
   * requests sent together could arrive out of order and leave students on an older slide.
   */
  let slideInFlight = false
  let nextSlide: [string, SlidePosition] | null = null
  function sendSlide(id: string, slide: SlidePosition) {
    nextSlide = [id, slide]
    if (slideInFlight) return
    slideInFlight = true
    void (async () => {
      while (nextSlide) {
        const [session, position] = nextSlide
        nextSlide = null
        await backend.setSlide(session, position).catch((error) => console.error(error))
      }
      slideInFlight = false
    })()
  }

  /** When each stroke being drawn was last updated: one whose author left mid-stroke is dropped. */
  const pendingSeen = new Map<string, number>()
  onSettled(() => {
    const timer = setInterval(() => {
      const stale = [...pendingSeen].filter(([, seen]) => Date.now() - seen > 5000)
      if (stale.length === 0) return
      for (const [id] of stale) pendingSeen.delete(id)
      setView((s) => {
        for (const [id] of stale) delete s.pending[id]
      })
    }, 1000)
    return () => clearInterval(timer)
  })

  function apply(event: SessionEvent) {
    setView((s) => {
      switch (event.type) {
        case 'snapshot':
          s.strokes = Object.fromEntries(event.strokes.map((stroke) => [stroke.id, stroke]))
          s.pending = {}
          s.presenter = event.presenter
          s.slide = event.slide
          break
        case 'add':
          s.strokes[event.stroke.id] = event.stroke
          delete s.pending[event.stroke.id]
          break
        case 'progress': {
          // Progress requests can arrive out of order, even after the stroke is saved.
          const { id, points } = event.stroke
          const shown = s.pending[id]
          if (id === stroke?.id || id in s.strokes) break
          if (shown && shown.points.length >= points.length) break
          s.pending[id] = event.stroke
          pendingSeen.set(id, Date.now())
          break
        }
        case 'remove':
          for (const id of event.ids) {
            delete s.strokes[id]
            delete s.pending[id]
          }
          break
        case 'restore':
          for (const stroke of event.strokes) s.strokes[stroke.id] = stroke
          break
        case 'slide':
          s.slide = event.slide
          break
        case 'presenter':
          s.presenter = event.presenter
          break
      }
    })
  }

  const isPresenter = createMemo(() => view.presenter !== null && view.presenter === state().email)
  const [follow, setFollow] = createSignal(true)

  const [slide, setSlide] = createSignal('0.0')
  const [box, setBox] = createSignal({ left: 0, top: 0, width: 0, height: 0 })
  const layout = (root: HTMLElement) => {
    const slides = root.querySelector('.slides')
    if (!slides) return
    const outer = root.getBoundingClientRect()
    const inner = slides.getBoundingClientRect()
    setBox({
      left: inner.left - outer.left,
      top: inner.top - outer.top,
      width: inner.width,
      height: inner.height,
    })
  }

  createEffect(
    () => [props.deck(), props.root()] as const,
    ([deck, root]) => {
      if (!deck || !root) return
      setSlide(slideKey(deck.getIndices()))
      const resize = () => layout(root)
      resize()
      const onSlide = () => {
        const indices = deck.getIndices()
        setSlide(slideKey(indices))
        const id = untrack(sessionId)
        if (id && untrack(isPresenter)) sendSlide(id, indices)
      }
      const events = ['slidechanged', 'fragmentshown', 'fragmenthidden']
      events.forEach((event) => deck.on(event, onSlide))
      deck.on('resize', resize)
      const observer = new ResizeObserver(resize)
      observer.observe(root)
      return () => {
        events.forEach((event) => deck.off(event, onSlide))
        deck.off('resize', resize)
        observer.disconnect()
      }
    },
  )

  createEffect(
    () => {
      const following = follow() && view.presenter !== null && !isPresenter()
      return [props.deck(), following && view.slide ? { ...view.slide } : null] as const
    },
    ([deck, target]) => {
      if (!target || !deck) return
      const now = deck.getIndices()
      if (now.h !== target.h || now.v !== target.v || now.f !== target.f) {
        deck.slide(target.h, target.v, target.f ?? -1)
      }
    },
  )

  const [tool, setTool] = createSignal<Tool | null>(null)
  const [color, setColor] = createSignal(colors[0]!)
  const [width, setWidth] = createSignal(widths[1]!)
  const [undo, setUndo] = createSignal<Action[]>([])
  const [redo, setRedo] = createSignal<Action[]>([])
  const [current, setCurrent] = createSignal<Stroke | null>(null)
  const [menu, setMenu] = createSignal(false)
  const drawing = createMemo(() => tool() !== null && state().canDraw && sessionId() !== null)

  // reveal.js reads swipes as moving to the next slide.
  createEffect(
    () => [props.deck(), drawing()] as const,
    ([deck, drawing]) => {
      deck?.configure({ touch: !drawing })
    },
  )

  /** The session's strokes with this browser's changes shown before they are saved, and undone if saving fails. */
  const [strokes, setStrokes] = createOptimisticStore(
    () => Object.values(view.strokes),
    [] as Stroke[],
  )
  /** Strokes the eraser has touched during the gesture under way. */
  const [erasing, setErasing] = createSignal<ReadonlySet<string>>(new Set())
  const onSlide = createMemo(() =>
    strokes.filter((stroke) => stroke.slide === slide() && !erasing().has(stroke.id)),
  )
  const pendingOnSlide = createMemo(() =>
    Object.values(view.pending).filter((stroke) => stroke.slide === slide()),
  )

  const report = (promise: Promise<unknown>) => void promise.catch((error) => console.error(error))
  /**
   * Starts an action once the event's own writes, such as the undo stack, are applied:
   * writes not yet flushed when an action is called wait until it settles.
   */
  const start = (call: () => Promise<unknown>) => {
    flush()
    report(call())
  }
  /** Saves one change after the other, so that undoing a stroke cannot reach the server before it. */
  let saving: Promise<unknown> = Promise.resolve()
  const save = (change: () => Promise<unknown>) => {
    const saved = saving.then(change)
    saving = saved.catch(() => {})
    return saved
  }

  /**
   * Shows an action at once, saves it, then writes it to the session's strokes,
   * which the live update repeats: if saving fails, the action is undone on screen.
   * New strokes are added, other strokes added back already exist on the server.
   */
  const perform = action(async function* (action: Action, isNew = false) {
    const id = sessionId()
    if (!id) return
    const ids = action.strokes.map((stroke) => stroke.id)
    setStrokes((draft) =>
      action.type === 'add'
        ? [...draft.filter((s) => !ids.includes(s.id)), ...action.strokes]
        : draft.filter((s) => !ids.includes(s.id)),
    )
    yield save(() =>
      action.type === 'remove'
        ? backend.removeStrokes(id, ids)
        : isNew
          ? backend.addStroke(id, action.strokes[0]!)
          : backend.restoreStrokes(id, ids),
    )
    // The live update of the session shown now would never undo a write meant for another.
    if (sessionId() !== id) return
    setView((s) => {
      for (const stroke of action.strokes) {
        if (action.type === 'add') s.strokes[stroke.id] = stroke
        else delete s.strokes[stroke.id]
      }
    })
  })

  const record = (action: Action) => {
    setUndo((stack) => [...stack, action])
    setRedo([])
  }

  /**
   * Starts `change`, made for the gesture `entry` in the undo or redo stack:
   * if it cannot be saved, the screen goes back to how it was, so the gesture can no longer be undone or redone.
   */
  const commit = (entry: Action, change: Action, isNew = false) =>
    start(() =>
      perform(change, isNew).catch((error) => {
        setUndo((stack) => stack.filter((action) => action !== entry))
        setRedo((stack) => stack.filter((action) => action !== entry))
        throw error
      }),
    )

  function undoLast() {
    const action = undo().at(-1)
    if (!action) return
    setUndo((stack) => stack.slice(0, -1))
    setRedo((stack) => [...stack, action])
    commit(action, { type: action.type === 'add' ? 'remove' : 'add', strokes: action.strokes })
  }

  function redoLast() {
    const action = redo().at(-1)
    if (!action) return
    setRedo((stack) => stack.slice(0, -1))
    setUndo((stack) => [...stack, action])
    commit(action, action)
  }

  function clearSlide() {
    const strokes = onSlide().map((stroke) => ({ ...stroke }))
    if (strokes.length === 0) return
    const action: Action = { type: 'remove', strokes }
    record(action)
    commit(action, action)
  }

  let svg: SVGSVGElement | undefined
  /** The stroke being drawn: `current` only shows it, as a signal's new value is read after a flush. */
  let stroke: Stroke | null = null
  let erased = new Map<string, Stroke>()
  let lastSent = 0

  const toSlide = (event: PointerEvent): Point => {
    const rect = svg!.getBoundingClientRect()
    return [
      round(((event.clientX - rect.left) / rect.width) * WIDTH),
      round(((event.clientY - rect.top) / rect.height) * HEIGHT),
      event.pointerType === 'pen' ? round(event.pressure, 2) : 0.5,
    ]
  }

  function erase(point: Point) {
    const hit = onSlide().filter((s) => !erased.has(s.id) && touches(s, point))
    if (hit.length === 0) return
    for (const s of hit) erased.set(s.id, { ...s })
    setErasing(new Set(erased.keys()))
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!drawing() || !event.isPrimary) return
    event.preventDefault()
    event.stopPropagation()
    svg!.setPointerCapture(event.pointerId)
    const point = toSlide(event)
    const active = tool()
    if (active === 'eraser') {
      erased = new Map()
      erase(point)
      return
    }
    stroke = {
      id: crypto.randomUUID(),
      slide: slide(),
      tool: active === 'highlighter' ? 'highlighter' : 'pen',
      color: active === 'highlighter' ? highlighter : color(),
      width: active === 'highlighter' ? width() * 4 : width(),
      points: [point],
    }
    setCurrent(stroke)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drawing() || !event.isPrimary || !svg?.hasPointerCapture(event.pointerId)) return
    event.stopPropagation()
    const events = event.getCoalescedEvents?.() ?? [event]
    const points = (events.length > 0 ? events : [event]).map(toSlide)
    if (tool() === 'eraser') {
      points.forEach(erase)
      return
    }
    if (!stroke) return
    stroke = { ...stroke, points: [...stroke.points, ...points] }
    setCurrent(stroke)
    const id = sessionId()
    if (id && event.timeStamp - lastSent > 50) {
      lastSent = event.timeStamp
      report(backend.drawing(id, stroke))
    }
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!svg?.hasPointerCapture(event.pointerId)) return
    svg.releasePointerCapture(event.pointerId)
    const id = sessionId()
    if (!id) return
    if (tool() === 'eraser') {
      const strokes = [...erased.values()]
      erased = new Map()
      setErasing(new Set<string>())
      if (strokes.length === 0) return
      const action: Action = { type: 'remove', strokes }
      record(action)
      commit(action, action)
      return
    }
    const done = stroke
    stroke = null
    setCurrent(null)
    if (!done) return
    const action: Action = { type: 'add', strokes: [done] }
    record(action)
    commit(action, action, true)
  }

  const [starting, setStarting] = createOptimistic(false)
  const startSession = action(async function* (name?: string) {
    setStarting(true)
    const slide = props.deck()?.getIndices()
    const id: string = yield backend.createSession(
      key(),
      name || t().defaultName(formatDate(new Date(), lang())),
    )
    yield backend.setLive(id, true, slide)
    setChosen(id)
  })

  function pickTool(next: Tool) {
    if (tool() === next) return setTool(null)
    setTool(next)
    if (sessionId() === null && !starting()) {
      start(() =>
        startSession().catch((error) => {
          setTool(null)
          throw error
        }),
      )
    }
  }

  const [name, setName] = createSignal('')

  const keepFocus: JSX.EventHandler<HTMLElement, MouseEvent> = (event) => event.preventDefault()

  const ToolButton = (buttonProps: {
    label: string
    active?: boolean
    disabled?: boolean
    onClick: () => void
    children: JSX.Element
  }) => (
    <button
      type="button"
      tabindex={-1}
      title={buttonProps.label}
      aria-label={buttonProps.label}
      aria-pressed={buttonProps.active ? 'true' : 'false'}
      disabled={buttonProps.disabled}
      onMouseDown={keepFocus}
      onClick={() => buttonProps.onClick()}
      class={[
        'flex h-8 w-8 cursor-pointer items-center justify-center rounded',
        'disabled:cursor-default disabled:opacity-30',
        buttonProps.active ? 'bg-(--m-dark) text-(--m-light)' : 'hover:bg-black/10',
      ]}
    >
      {buttonProps.children}
    </button>
  )

  return (
    <Show when={state().canDraw || state().sessions.length > 0}>
      <svg
        ref={(el) => (svg = el)}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        data-annotations
        class={['absolute z-20', drawing() ? 'cursor-crosshair touch-none' : 'pointer-events-none']}
        style={{
          left: `${box().left}px`,
          top: `${box().top}px`,
          width: `${box().width}px`,
          height: `${box().height}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <For each={onSlide()}>{(stroke) => <StrokeView stroke={stroke} />}</For>
        <For each={pendingOnSlide()}>{(stroke) => <StrokeView stroke={stroke} />}</For>
        <Show when={current()}>{(stroke) => <StrokeView stroke={stroke()} />}</Show>
      </svg>
      <div
        data-annotations-toolbar
        class="absolute top-2 right-2 z-30 flex items-center gap-1 rounded-lg bg-white/90 p-1 text-base text-(--m-dark) shadow"
      >
        <Show when={state().canDraw}>
          <ToolButton label={t().pen} active={tool() === 'pen'} onClick={() => pickTool('pen')}>
            <Fa icon={faPen} />
          </ToolButton>
          <ToolButton
            label={t().highlighter}
            active={tool() === 'highlighter'}
            onClick={() => pickTool('highlighter')}
          >
            <Fa icon={faHighlighter} />
          </ToolButton>
          <ToolButton
            label={t().eraser}
            active={tool() === 'eraser'}
            onClick={() => pickTool('eraser')}
          >
            <Fa icon={faEraser} />
          </ToolButton>
          <Show when={tool() === 'pen'}>
            <For each={colors}>
              {(c) => (
                <ToolButton label={t().color} active={color() === c} onClick={() => setColor(c)}>
                  <span class="h-4 w-4 rounded-full" style={{ background: c }} />
                </ToolButton>
              )}
            </For>
          </Show>
          <Show when={tool() === 'pen' || tool() === 'highlighter'}>
            <For each={widths}>
              {(w) => (
                <ToolButton label={t().width} active={width() === w} onClick={() => setWidth(w)}>
                  <span
                    class="rounded-full bg-current"
                    style={{ width: `${w + 2}px`, height: `${w + 2}px` }}
                  />
                </ToolButton>
              )}
            </For>
          </Show>
          <ToolButton label={t().undo} disabled={undo().length === 0} onClick={undoLast}>
            <Fa icon={faRotateLeft} />
          </ToolButton>
          <ToolButton label={t().redo} disabled={redo().length === 0} onClick={redoLast}>
            <Fa icon={faRotateRight} />
          </ToolButton>
          <ToolButton label={t().clear} disabled={onSlide().length === 0} onClick={clearSlide}>
            <Fa icon={faTrashCan} />
          </ToolButton>
        </Show>
        <div class="relative">
          <button
            type="button"
            tabindex={-1}
            onMouseDown={keepFocus}
            onClick={() => setMenu((open) => !open)}
            aria-expanded={menu() ? 'true' : 'false'}
            class="flex h-8 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-black/10"
          >
            <Show when={session()?.presenter}>
              <span class="h-2 w-2 rounded-full bg-red-600" aria-label={t().live} />
            </Show>
            <span class="max-w-48 truncate">{session()?.name ?? t().sessions}</span>
            <Fa icon={faChevronDown} class="text-xs" />
          </button>
          <Show when={menu()}>
            <div class="absolute top-9 right-0 w-72 space-y-2 rounded-lg bg-white p-3 text-sm shadow-lg">
              <ul class="max-h-60 space-y-1 overflow-y-auto">
                <li>
                  <label class="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name={`session-${props.deckId}`}
                      checked={sessionId() === null}
                      onChange={() => setChosen(null)}
                    />
                    {t().none}
                  </label>
                </li>
                <For each={state().sessions}>
                  {(s) => (
                    <li>
                      <label class="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`session-${props.deckId}`}
                          checked={sessionId() === s.id}
                          onChange={() => setChosen(s.id)}
                        />
                        <span class="flex-1 truncate">{s.name}</span>
                        <Show
                          when={s.presenter}
                          fallback={
                            <span class="text-xs opacity-60">{formatDate(s.created, lang())}</span>
                          }
                        >
                          <span class="text-xs text-red-600">{t().live}</span>
                        </Show>
                      </label>
                    </li>
                  )}
                </For>
              </ul>
              <Show when={view.presenter !== null && !isPresenter()}>
                <label class="flex cursor-pointer items-center gap-2 border-t pt-2">
                  <input
                    type="checkbox"
                    checked={follow()}
                    onChange={(event) => setFollow(event.currentTarget.checked)}
                  />
                  {t().follow}
                </label>
              </Show>
              <Show when={state().canDraw}>
                <Show when={sessionId()}>
                  {(id) => (
                    <button
                      type="button"
                      class="w-full cursor-pointer rounded border px-2 py-1 hover:bg-gray-50"
                      onClick={() =>
                        report(backend.setLive(id(), !isPresenter(), props.deck()?.getIndices()))
                      }
                    >
                      {isPresenter() ? t().stop : t().present}
                    </button>
                  )}
                </Show>
                <form
                  class="flex gap-2 border-t pt-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const chosenName = name().trim()
                    setName('')
                    start(() => startSession(chosenName))
                  }}
                >
                  <input
                    class="min-w-0 flex-1 rounded border px-2 py-1"
                    placeholder={t().newSession}
                    value={name()}
                    onInput={(event) => setName(event.currentTarget.value)}
                  />
                  <button
                    type="submit"
                    class="cursor-pointer rounded bg-(--m-dark) px-2 py-1 text-white"
                  >
                    {t().create}
                  </button>
                </form>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
