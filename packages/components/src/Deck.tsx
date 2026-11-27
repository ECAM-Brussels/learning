import { faCompress, faExpand } from '@fortawesome/free-solid-svg-icons'
import { dynamic, type JSX } from '@solidjs/web'
import RevealJS, { type FragmentAnimation, type RevealApi, type RevealConfig } from 'reveal.js'
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  omit,
  onSettled,
  Show,
  snapshot,
  useContext,
} from 'solid-js'
import { Annotations } from './Annotations'
import './Deck.css'
import { Fa } from './Fa'
import { useLang, useMeta } from './Meta'
import { TOCContext } from './Page'

type RevealPlugin = NonNullable<RevealConfig['plugins']>[number]
type RevealEvent = Event & Record<string, unknown>

const DeckContext = createContext<{
  deck: () => RevealApi | null
  /** Changes whenever reveal.js has (re)read the slides, e.g. to recompute a slide's position. */
  synced: () => number
  changed: () => void
}>({ deck: () => null, synced: () => 0, changed: () => {} })

/** The reveal.js instance of the enclosing deck, or null until it is ready. */
export function useDeck() {
  return useContext(DeckContext).deck
}

/**
 * Tells reveal.js when slides appear or go, e.g. under `Show` or `For`:
 * it reads the slides once when it starts and again only on `sync()`.
 */
function useSlideLifecycle() {
  const { changed } = useContext(DeckContext)
  onSettled(() => {
    changed()
    return changed
  })
}

const defaults: RevealConfig = {
  embedded: true,
  width: 1280,
  height: 720,
  margin: 0,
  center: false,
  hash: false,
  // Arrow keys would otherwise move every deck on the page, and stop the page from scrolling.
  keyboardCondition: 'focused',
  progress: true,
  slideNumber: 'c/t',
  // Bottom right, the arrows would cover the slide number.
  controlsLayout: 'edges',
  transition: 'none',
  backgroundTransition: 'none',
}

type DeckProps = {
  /** reveal.js options (https://revealjs.com/config/), applied again when they change. */
  config?: Omit<RevealConfig, 'plugins'>
  /** reveal.js plugins, such as `reveal.js/plugin/notes`: read once, when the deck starts. */
  plugins?: RevealPlugin[]
  /** Sizes the deck; 16:9 and as wide as its container by default. */
  class?: string
  /**
   * Who may draw on the deck, live for everyone watching: emails separated by commas or spaces.
   * The server reads them from the page's source, so write them as a plain string.
   */
  annotators?: string
  /** Tells apart the decks of a page that can be drawn on, whose strokes are saved by id. */
  id?: string
  children?: JSX.Element
  onReady?: (deck: RevealApi) => void
  onSlideChange?: (event: RevealEvent) => void
  onFragmentShown?: (event: RevealEvent) => void
  onFragmentHidden?: (event: RevealEvent) => void
}

const labels = {
  fr: { enter: 'Plein écran', exit: 'Quitter le plein écran' },
  en: { enter: 'Full screen', exit: 'Exit full screen' },
}

const events = {
  slidechanged: 'onSlideChange',
  fragmentshown: 'onFragmentShown',
  fragmenthidden: 'onFragmentHidden',
} as const

/**
 * A reveal.js presentation, styled after the Metropolis Beamer theme.
 * Its children are slides: `Deck.Slide`, `Deck.Title`, `Deck.Section`, `Deck.Standout` or a `Deck.Stack` of them.
 * Click a deck to drive it with the keyboard; press F, or its button, for full screen.
 *
 * @example
 * <Deck>
 *   <Deck.Title title="Dérivées" author="Jane Doe" />
 *   <Deck.Slide title="Définition">
 *     <p>La dérivée de <Deck.Alert>f</Deck.Alert> en a est…</p>
 *   </Deck.Slide>
 * </Deck>
 */
function DeckRoot(props: DeckProps) {
  const [deck, setDeck] = createSignal<RevealApi | null>(null)
  const [synced, setSynced] = createSignal(0)
  const [el, setEl] = createSignal<HTMLDivElement>()

  let disposed = false
  let pending = false
  const changed = () => {
    if (pending || disposed || !deck()) return
    pending = true
    queueMicrotask(() => {
      pending = false
      // Slides also report going when the whole deck goes, after reveal.js is destroyed.
      if (disposed) return
      deck()!.sync()
      setSynced((n) => n + 1)
    })
  }

  onSettled(() => {
    const instance = new RevealJS(el()!, {
      ...defaults,
      ...snapshot(props.config),
      plugins: props.plugins ?? [],
    })
    void instance.initialize().then(() => {
      if (disposed) return
      setDeck(instance)
      setSynced((n) => n + 1)
      props.onReady?.(instance)
    })
    return () => {
      disposed = true
      instance.destroy()
    }
  })

  createEffect(
    () => [deck(), props.config] as const,
    ([deck, config]) => {
      if (deck && config) deck.configure({ ...defaults, ...snapshot(config) })
    },
  )

  const [fullscreen, setFullscreen] = createSignal(false)
  onSettled(() => {
    const update = () => setFullscreen(document.fullscreenElement === el())
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  })
  const toggleFullscreen = () =>
    fullscreen() ? document.exitFullscreen() : el()!.requestFullscreen()
  const lang = useLang()

  createEffect(deck, (deck) => {
    if (!deck) return
    const listeners = Object.entries(events).map(([event, prop]) => {
      const listener = (e: Event) => props[prop]?.(e as RevealEvent)
      deck.on(event, listener)
      return () => deck.off(event, listener)
    })
    return () => listeners.forEach((off) => off())
  })

  return (
    <DeckContext value={{ deck, synced, changed }}>
      <div
        class={['not-prose mx-auto my-4 shadow', props.class ?? 'aspect-video w-full']}
        style={{
          '--m-dark': '#23373b',
          '--m-accent': '#eb811b',
          '--m-light': '#fafafa',
          '--r-link-color': 'var(--m-accent)',
        }}
      >
        <div
          ref={setEl}
          class={[
            'reveal bg-(--m-light) font-sans font-light text-(--m-dark) focus:outline-none',
            '[&_.progress]:h-1 [&_.progress]:bg-transparent [&_.progress]:text-(--m-accent)',
            '[&_.slide-number]:bg-transparent [&_.slide-number]:font-sans [&_.slide-number]:text-base',
            '[&_.slide-number]:text-current [&_.slide-number]:opacity-70',
            '[&_.controls]:text-current',
            // Set by reveal.js while a standout slide is shown.
            '[&.standout_.controls]:text-(--m-light) [&.standout_.slide-number]:text-(--m-light)',
            '[&.standout_[data-fullscreen-toggle]]:text-(--m-light)',
          ]}
        >
          <div class="slides">
            {/* Headings in slides are not the page's: MDX gives them the page's heading components. */}
            <TOCContext value={null}>{props.children}</TOCContext>
          </div>
          <Show when={props.annotators !== undefined}>
            <Annotations deckId={props.id ?? ''} deck={deck} root={el} />
          </Show>
          <button
            type="button"
            data-fullscreen-toggle
            aria-label={labels[lang()][fullscreen() ? 'exit' : 'enter']}
            title={labels[lang()][fullscreen() ? 'exit' : 'enter']}
            class="absolute bottom-3 left-3 z-30 cursor-pointer text-xl opacity-50 hover:opacity-100"
            onClick={() => void toggleFullscreen()}
          >
            <Fa icon={fullscreen() ? faCompress : faExpand} />
          </button>
        </div>
      </div>
    </DeckContext>
  )
}

type SlideProps = {
  /** Shown in a dark bar across the top, like a Beamer frame title. */
  title?: JSX.Element
  /** Classes of the slide's body, e.g. to lay out columns. */
  class?: string
  /** Any CSS background: a colour, a gradient or an image URL. */
  background?: string
  backgroundColor?: string
  backgroundImage?: string
  backgroundSize?: string
  backgroundOpacity?: number
  transition?: RevealConfig['transition']
  autoAnimate?: boolean
  /**
   * Leaves the slide out of the numbering, e.g. for an appendix.
   * To leave a slide out, wrap it in `Show`: reveal.js would remove a `hidden` slide from under Solid.
   */
  visibility?: 'uncounted'
  children?: JSX.Element
} & { [key: `data-${string}`]: string | number | boolean | undefined }

/** Props a section turns into attributes itself: any other is passed on, such as `data-*`. */
const sectionProps = [
  'class',
  'background',
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundOpacity',
  'transition',
  'autoAnimate',
  'visibility',
  'children',
] as const

/** The `<section>` every kind of slide renders, with its reveal.js attributes. */
function Section(props: Omit<SlideProps, 'title'>) {
  useSlideLifecycle()
  const { deck } = useContext(DeckContext)
  const [el, setEl] = createSignal<HTMLElement>()
  const data = createMemo(() => ({
    'data-background': props.background,
    'data-background-color': props.backgroundColor,
    'data-background-image': props.backgroundImage,
    'data-background-size': props.backgroundSize,
    'data-background-opacity': props.backgroundOpacity,
    'data-transition': props.transition,
    'data-auto-animate': props.autoAnimate || undefined,
    'data-visibility': props.visibility,
    ...omit(props, ...sectionProps),
  }))
  // reveal.js reads a slide's attributes when it starts, and again only when told.
  // A slide that has just appeared is read by the deck's sync: syncing it alone before that fails.
  createEffect(
    () => [deck(), el(), data()] as const,
    ([deck, el], previous) => {
      if (deck && el && previous?.[0] === deck) deck.syncSlide(el)
    },
  )
  return (
    <section ref={setEl} class="h-full" {...data()}>
      <div
        class={[
          'flex h-full flex-col text-left text-[32px] leading-snug',
          // Like Beamer's \alert; in MDX, bold text and headings are the page's, which a deck can't swap.
          '[&_strong]:font-normal [&_strong]:text-(--m-accent)',
          '[&_:is(h3,h4,h5,h6)]:text-(--m-accent) [&_h3]:text-[36px]',
          props.class,
        ]}
      >
        {props.children}
      </div>
    </section>
  )
}

/**
 * A slide, with an optional frame title.
 * Its content is centred vertically; pass `class` to lay it out otherwise.
 */
function Slide(props: SlideProps) {
  const section = omit(props, 'title', 'class', 'children')
  return (
    <Section {...section}>
      <Show when={props.title}>
        <h2 class="bg-(--m-dark) px-10 py-5 text-[40px] leading-tight text-(--m-light)">
          {props.title}
        </h2>
      </Show>
      <div class="flex flex-1 flex-col justify-center px-16 py-10">
        <div
          class={[
            'space-y-6 [&_li]:my-3 [&_ol]:list-decimal [&_ol]:pl-10 [&_ul]:list-disc [&_ul]:pl-10',
            props.class,
          ]}
        >
          {props.children}
        </div>
      </div>
    </Section>
  )
}

/**
 * The title slide: title, subtitle, an accent rule, then who, where and when.
 * What it is not given comes from the page's `defineMeta`.
 */
function Title(
  props: Omit<SlideProps, 'title'> & {
    title?: JSX.Element
    subtitle?: JSX.Element
    author?: JSX.Element
    institute?: JSX.Element
    date?: JSX.Element
  },
) {
  const meta = useMeta()
  const section = omit(props, 'title', 'subtitle', 'author', 'institute', 'date', 'children')
  const subtitle = () => props.subtitle ?? meta?.subtitle
  const author = () => props.author ?? meta?.author
  const institute = () => props.institute ?? meta?.institute
  const date = () => props.date ?? meta?.date
  return (
    <Section {...section}>
      <div class="flex flex-1 flex-col justify-center gap-3 px-24">
        <h1 class="text-[56px] leading-tight">{props.title ?? meta?.title}</h1>
        <Show when={subtitle()}>
          <p class="text-[36px] opacity-80">{subtitle()}</p>
        </Show>
        <hr class="my-6 border-t-2 border-(--m-accent)" />
        <Show when={author()}>
          <p>{author()}</p>
        </Show>
        <Show when={institute()}>
          <p class="text-[26px] opacity-80">{institute()}</p>
        </Show>
        <Show when={date()}>
          <p class="text-[26px] opacity-80">{date()}</p>
        </Show>
        {props.children}
      </div>
    </Section>
  )
}

/** Opens a section of the talk, with a bar showing how far into the deck it is. */
function SectionSlide(props: Omit<SlideProps, 'title'> & { title: JSX.Element }) {
  const { deck, synced } = useContext(DeckContext)
  const [el, setEl] = createSignal<HTMLElement>()
  const progress = createMemo(() => {
    synced()
    const current = deck()
    const slide = el()?.closest<HTMLElement>('.slides > section')
    if (!current || !slide) return 0
    const slides = current.getHorizontalSlides()
    return (slides.indexOf(slide) + 1) / slides.length
  })
  const section = omit(props, 'title', 'children')
  return (
    <Section {...section}>
      <div ref={setEl} class="mx-auto flex w-3/5 flex-1 flex-col justify-center gap-4">
        <h2 class="text-[48px] leading-tight">{props.title}</h2>
        <div class="h-1 bg-(--m-dark)/15">
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress() * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            class="h-full bg-(--m-accent)"
            style={{ width: `${progress() * 100}%` }}
          />
        </div>
        {props.children}
      </div>
    </Section>
  )
}

/** A dark slide with one big statement, such as a question to the audience. */
function Standout(props: Omit<SlideProps, 'title'>) {
  const section = omit(props, 'children')
  return (
    <Section backgroundColor="var(--m-dark)" data-state="standout" {...section}>
      <div class="flex flex-1 items-center justify-center px-24 text-center text-[56px] text-(--m-light)">
        {props.children}
      </div>
    </Section>
  )
}

/** Slides shown one below the other: the deck moves down through them before moving on. */
function Stack(props: { children?: JSX.Element }) {
  useSlideLifecycle()
  return <section>{props.children}</section>
}

/** Content shown one step at a time, as the presenter moves forward. */
function Fragment(props: {
  /** How it appears, `fade-in` by default (https://revealjs.com/fragments/). */
  animation?: FragmentAnimation
  /** Fragments with the same index appear together, in increasing order. */
  index?: number
  /** The element to render, `span` by default: e.g. `li` in a list. */
  as?: string
  class?: string
  children?: JSX.Element
}) {
  const Element = dynamic(() => props.as ?? 'span')
  return (
    <Element class={['fragment', props.animation, props.class]} data-fragment-index={props.index}>
      {props.children}
    </Element>
  )
}

/** Its children side by side, in columns of equal width. */
function Columns(props: { class?: string; children?: JSX.Element }) {
  return <div class={['grid auto-cols-fr grid-flow-col gap-8', props.class]}>{props.children}</div>
}

/** Speaker notes, shown in the speaker view (press S) when the deck has the notes plugin. */
function Notes(props: { children?: JSX.Element }) {
  return <aside class="notes">{props.children}</aside>
}

/** Emphasised text in the accent colour, like Beamer's `\alert`. */
function Alert(props: { children?: JSX.Element }) {
  return <span class="text-(--m-accent)">{props.children}</span>
}

export const Deck = Object.assign(DeckRoot, {
  Slide,
  Title,
  Section: SectionSlide,
  Standout,
  Stack,
  Fragment,
  Columns,
  Notes,
  Alert,
})

export default Deck
