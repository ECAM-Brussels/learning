import { fireEvent, render, waitFor, within } from '@solidjs/testing-library'
import type { JSX } from '@solidjs/web'
import { describe, expect, mock, spyOn, test } from 'bun:test'
import type { RevealApi } from 'reveal.js'
import { createSignal, flush, For, Show, type ComponentProps } from 'solid-js'
import { Deck, useDeck } from './Deck'

type DeckProps = ComponentProps<typeof Deck>

async function renderDeck(children: () => JSX.Element, props: Omit<DeckProps, 'children'> = {}) {
  let deck: RevealApi | undefined
  const result = render(() => (
    <Deck {...props} onReady={(d) => (deck = d)}>
      {children()}
    </Deck>
  ))
  // reveal.js starts in a tenth of a second, but can take over the default second when every suite runs at once.
  await waitFor(() => expect(deck).toBeDefined(), { timeout: 5000 })
  return { ...result, deck: deck! }
}

/** Lets slides that came or went report it, and reveal.js read them again. */
async function settle() {
  flush()
  await Promise.resolve()
  flush()
}

/**
 * Queries the slides only: reveal.js copies the current slide's text into a live region for screen readers.
 * Role queries need `hidden: true`, as reveal.js hides the other slides from them.
 */
const slides = () => within(document.querySelector<HTMLElement>('.slides')!)

/** The `data-*` attributes of an element, without reveal.js's own `style` and `class`. */
const data = (el: HTMLElement) =>
  Object.fromEntries(
    el
      .getAttributeNames()
      .filter((n) => n.startsWith('data-'))
      .map((n) => [n, el.getAttribute(n)]),
  )

const sections = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('.slides > section'))

describe('Deck', () => {
  test('starts reveal.js on its slides', async () => {
    const { container, deck } = await renderDeck(() => (
      <>
        <Deck.Slide>One</Deck.Slide>
        <Deck.Slide>Two</Deck.Slide>
      </>
    ))
    expect(container.querySelector('.reveal > .slides')).not.toBeNull()
    expect(deck.isReady()).toBe(true)
    expect(deck.getTotalSlides()).toBe(2)
    expect(deck.getCurrentSlide()).toBe(sections(container)[0]!)
  })

  test('is embedded in the page, 16:9, and only takes keys once focused', async () => {
    const { deck } = await renderDeck(() => <Deck.Slide />)
    expect(deck.getConfig()).toMatchObject({
      embedded: true,
      width: 1280,
      height: 720,
      center: false,
      hash: false,
      keyboardCondition: 'focused',
      progress: true,
      slideNumber: 'c/t',
    })
  })

  test('applies its config over the defaults, and again when it changes', async () => {
    const [transition, setTransition] = createSignal<'fade' | 'zoom'>('fade')
    const { deck } = await renderDeck(() => <Deck.Slide />, {
      get config() {
        return { transition: transition(), progress: false }
      },
    })
    expect(deck.getConfig()).toMatchObject({ transition: 'fade', progress: false, embedded: true })
    setTransition('zoom')
    flush()
    expect(deck.getConfig()).toMatchObject({ transition: 'zoom', embedded: true })
  })

  test('registers its plugins with reveal.js', async () => {
    let initialized: RevealApi | undefined
    const plugin = { id: 'probe', init: (deck: RevealApi) => void (initialized = deck) }
    const { deck } = await renderDeck(() => <Deck.Slide />, { plugins: [plugin] })
    // reveal.js gives plugins another object than its instance, for the same presentation.
    expect(initialized?.getRevealElement()).toBe(deck.getRevealElement())
    expect(deck.hasPlugin('probe')).toBe(true)
  })

  test('takes the size of its class instead of the default', async () => {
    const { container } = await renderDeck(() => <Deck.Slide />, { class: 'h-96 w-160' })
    const frame = container.querySelector('.reveal')!.parentElement
    expect(frame).toHaveClass('h-96', 'w-160')
    expect(frame).not.toHaveClass('aspect-video')
  })

  test('reports slide changes and fragments', async () => {
    const onSlideChange = mock((_e: Event) => {})
    const onFragmentShown = mock((_e: Event) => {})
    const onFragmentHidden = mock((_e: Event) => {})
    const { deck } = await renderDeck(
      () => (
        <>
          <Deck.Slide>
            <Deck.Fragment>Step</Deck.Fragment>
          </Deck.Slide>
          <Deck.Slide>Two</Deck.Slide>
        </>
      ),
      { onSlideChange, onFragmentShown, onFragmentHidden },
    )
    deck.next()
    expect(onFragmentShown).toHaveBeenCalledTimes(1)
    deck.prev()
    expect(onFragmentHidden).toHaveBeenCalledTimes(1)
    deck.next()
    deck.next()
    expect(onSlideChange).toHaveBeenCalledTimes(1)
    expect(onSlideChange.mock.calls[0]![0]).toMatchObject({ indexh: 1, indexv: 0 })
  })

  test('calls the handler it has when the event happens', async () => {
    const first = mock(() => {})
    const second = mock(() => {})
    // Wrapped: createSignal would take a function for a computation.
    const [handler, setHandler] = createSignal({ onSlideChange: first })
    const { deck } = await renderDeck(
      () => (
        <>
          <Deck.Slide />
          <Deck.Slide />
        </>
      ),
      {
        get onSlideChange() {
          return handler().onSlideChange
        },
      },
    )
    setHandler({ onSlideChange: second })
    flush()
    deck.next()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('gives its reveal.js instance to the components inside it', async () => {
    function Next() {
      const deck = useDeck()
      return <button onClick={() => deck()?.next()}>Suivant</button>
    }
    const { deck } = await renderDeck(() => (
      <>
        <Deck.Slide>
          <Next />
        </Deck.Slide>
        <Deck.Slide />
      </>
    ))
    fireEvent.click(slides().getByText('Suivant'))
    expect(deck.getIndices().h).toBe(1)
  })

  test('gives null outside a deck', () => {
    let deck: (() => RevealApi | null) | undefined
    render(() => {
      deck = useDeck()
      return null
    })
    expect(deck!()).toBeNull()
  })

  test('tells reveal.js when slides come and go', async () => {
    const [extra, setExtra] = createSignal(false)
    const { deck } = await renderDeck(() => (
      <>
        <Deck.Slide>One</Deck.Slide>
        <Show when={extra()}>
          <Deck.Slide>Two</Deck.Slide>
          <Deck.Stack>
            <Deck.Slide>Three</Deck.Slide>
          </Deck.Stack>
        </Show>
      </>
    ))
    const sync = spyOn(deck, 'sync')
    setExtra(true)
    await settle()
    expect(sync).toHaveBeenCalledTimes(1)
    expect(deck.getTotalSlides()).toBe(3)
    setExtra(false)
    await settle()
    expect(deck.getTotalSlides()).toBe(1)
  })

  test('follows slides reordered by For', async () => {
    const [titles, setTitles] = createSignal(['A', 'B', 'C'])
    const { container, deck } = await renderDeck(() => (
      <For each={titles()}>{(title) => <Deck.Slide title={title} />}</For>
    ))
    setTitles(['C', 'A'])
    await settle()
    expect(deck.getTotalSlides()).toBe(2)
    expect(sections(container).map((s) => s.textContent)).toEqual(['C', 'A'])
  })

  test('destroys reveal.js when it goes, without syncing it afterwards', async () => {
    const { deck, unmount } = await renderDeck(() => <Deck.Slide />)
    const destroy = spyOn(deck, 'destroy')
    const sync = spyOn(deck, 'sync')
    unmount()
    await settle()
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(sync).not.toHaveBeenCalled()
  })

  test('does not start reveal.js when it goes before it is ready', async () => {
    const onReady = mock(() => {})
    const { unmount } = render(() => (
      <Deck onReady={onReady}>
        <Deck.Slide />
      </Deck>
    ))
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onReady).not.toHaveBeenCalled()
  })
})

describe('Deck.Slide', () => {
  test('shows its title as a frame title', async () => {
    await renderDeck(() => <Deck.Slide title="Définition">Body</Deck.Slide>)
    expect(slides().getByRole('heading', { level: 2, hidden: true })).toHaveTextContent(
      'Définition',
    )
    expect(slides().getByText('Body')).toBeInTheDocument()
  })

  test('has no frame title without a title', async () => {
    await renderDeck(() => <Deck.Slide>Body</Deck.Slide>)
    expect(slides().queryByRole('heading', { hidden: true })).toBeNull()
  })

  test('puts its class on its body', async () => {
    await renderDeck(() => <Deck.Slide class="grid grid-cols-2">Body</Deck.Slide>)
    expect(slides().getByText('Body')).toHaveClass('grid', 'grid-cols-2')
  })

  test('turns its props into reveal.js attributes', async () => {
    const { container } = await renderDeck(() => (
      <Deck.Slide
        background="url(a.png)"
        backgroundColor="#000"
        backgroundImage="b.png"
        backgroundSize="contain"
        backgroundOpacity={0.5}
        transition="zoom"
        autoAnimate
        visibility="uncounted"
        data-state="dark"
      />
    ))
    expect(data(sections(container)[0]!)).toEqual({
      'data-background': 'url(a.png)',
      'data-background-color': '#000',
      'data-background-image': 'b.png',
      'data-background-size': 'contain',
      'data-background-opacity': '0.5',
      'data-transition': 'zoom',
      'data-auto-animate': '',
      'data-visibility': 'uncounted',
      'data-state': 'dark',
    })
  })

  test('leaves out the attributes it is not given', async () => {
    const { container } = await renderDeck(() => <Deck.Slide />)
    expect(data(sections(container)[0]!)).toEqual({})
  })

  test('tells reveal.js when its attributes change', async () => {
    const [color, setColor] = createSignal('#000')
    const { container, deck } = await renderDeck(() => <Deck.Slide backgroundColor={color()} />)
    const syncSlide = spyOn(deck, 'syncSlide')
    setColor('#fff')
    flush()
    const section = sections(container)[0]!
    expect(section.getAttribute('data-background-color')).toBe('#fff')
    expect(syncSlide).toHaveBeenCalledWith(section)
  })

  test('leaves an uncounted slide out of the numbering', async () => {
    const { deck } = await renderDeck(() => (
      <>
        <Deck.Slide />
        <Deck.Slide visibility="uncounted" />
      </>
    ))
    expect(deck.getTotalSlides()).toBe(1)
  })
})

describe('Deck.Stack', () => {
  test('stacks its slides vertically', async () => {
    const { container, deck } = await renderDeck(() => (
      <>
        <Deck.Slide>One</Deck.Slide>
        <Deck.Stack>
          <Deck.Slide>Two</Deck.Slide>
          <Deck.Slide>Three</Deck.Slide>
        </Deck.Stack>
      </>
    ))
    expect(sections(container)).toHaveLength(2)
    expect(deck.getTotalSlides()).toBe(3)
    deck.right()
    deck.down()
    expect(deck.getIndices()).toMatchObject({ h: 1, v: 1 })
    expect(deck.getCurrentSlide()).toHaveTextContent('Three')
  })
})

describe('Deck.Title', () => {
  test('shows the talk and who gives it', async () => {
    await renderDeck(() => (
      <Deck.Title
        title="Dérivées"
        subtitle="Analyse 1"
        author="Jane Doe"
        institute="ECAM"
        date="2026"
      >
        <img alt="logo" />
      </Deck.Title>
    ))
    expect(slides().getByRole('heading', { level: 1, hidden: true })).toHaveTextContent('Dérivées')
    for (const text of ['Analyse 1', 'Jane Doe', 'ECAM', '2026']) {
      expect(slides().getByText(text)).toBeInTheDocument()
    }
    expect(slides().getByAltText('logo')).toBeInTheDocument()
  })

  test('leaves out what it is not given', async () => {
    const { container } = await renderDeck(() => <Deck.Title title="Dérivées" />)
    expect(container.querySelectorAll('.slides p')).toHaveLength(0)
  })
})

describe('Deck.Section', () => {
  const progress = () =>
    Number(slides().getByRole('progressbar', { hidden: true }).getAttribute('aria-valuenow'))

  test('shows how far into the deck it is', async () => {
    await renderDeck(() => (
      <>
        <Deck.Title title="Talk" />
        <Deck.Section title="Part one" />
        <Deck.Slide />
        <Deck.Slide />
      </>
    ))
    expect(slides().getByRole('heading', { level: 2, hidden: true })).toHaveTextContent('Part one')
    expect(progress()).toBe(50)
  })

  test('counts a stack as one slide, wherever it is in one', async () => {
    await renderDeck(() => (
      <>
        <Deck.Stack>
          <Deck.Slide />
          <Deck.Section title="Inside" />
        </Deck.Stack>
        <Deck.Slide />
      </>
    ))
    expect(progress()).toBe(50)
  })

  test('updates when slides come or go', async () => {
    const [extra, setExtra] = createSignal(false)
    await renderDeck(() => (
      <>
        <Deck.Section title="Part one" />
        <Deck.Slide />
        <Show when={extra()}>
          <Deck.Slide />
          <Deck.Slide />
        </Show>
      </>
    ))
    expect(progress()).toBe(50)
    setExtra(true)
    await settle()
    expect(progress()).toBe(25)
  })
})

describe('Deck.Standout', () => {
  test('is dark, unless given another background', async () => {
    const { container } = await renderDeck(() => (
      <>
        <Deck.Standout>Questions ?</Deck.Standout>
        <Deck.Standout backgroundColor="#600">Pause</Deck.Standout>
      </>
    ))
    const [dark, red] = sections(container)
    expect(dark!.getAttribute('data-background-color')).toBe('var(--m-dark)')
    expect(red!.getAttribute('data-background-color')).toBe('#600')
    expect(slides().getByText('Questions ?')).toBeInTheDocument()
  })

  test('lets the deck light its controls while it is shown', async () => {
    const { container, deck } = await renderDeck(() => (
      <>
        <Deck.Slide />
        <Deck.Standout>Questions ?</Deck.Standout>
      </>
    ))
    const reveal = container.querySelector('.reveal')!
    expect(reveal).not.toHaveClass('standout')
    deck.next()
    expect(reveal).toHaveClass('standout')
  })
})

describe('Deck.Fragment', () => {
  test('appears when the presenter moves forward', async () => {
    const { deck } = await renderDeck(() => (
      <Deck.Slide>
        <Deck.Fragment>Step</Deck.Fragment>
      </Deck.Slide>
    ))
    const step = slides().getByText('Step')
    expect(step.tagName).toBe('SPAN')
    expect(step).toHaveClass('fragment')
    expect(step).not.toHaveClass('visible')
    deck.next()
    expect(step).toHaveClass('visible')
  })

  test('renders the element and animation it is given', async () => {
    await renderDeck(() => (
      <Deck.Slide>
        <ul>
          <Deck.Fragment as="li" animation="fade-up" class="font-bold">
            Item
          </Deck.Fragment>
        </ul>
      </Deck.Slide>
    ))
    const item = slides().getByText('Item')
    expect(item.tagName).toBe('LI')
    expect(item).toHaveClass('fragment', 'fade-up', 'font-bold')
  })

  test('appears in the order of its index', async () => {
    const { deck } = await renderDeck(() => (
      <Deck.Slide>
        <Deck.Fragment index={2}>Second</Deck.Fragment>
        <Deck.Fragment index={1}>First</Deck.Fragment>
      </Deck.Slide>
    ))
    deck.next()
    expect(slides().getByText('First')).toHaveClass('visible')
    expect(slides().getByText('Second')).not.toHaveClass('visible')
  })
})

describe('Deck.Notes', () => {
  test('are the speaker notes of their slide', async () => {
    const { deck } = await renderDeck(() => (
      <Deck.Slide>
        Body
        <Deck.Notes>Remember the example</Deck.Notes>
      </Deck.Slide>
    ))
    expect(deck.getSlideNotes()).toContain('Remember the example')
  })
})

describe('Deck.Alert', () => {
  test('stands out in the accent colour', async () => {
    await renderDeck(() => (
      <Deck.Slide>
        <Deck.Alert>important</Deck.Alert>
      </Deck.Slide>
    ))
    expect(slides().getByText('important')).toHaveClass('text-(--m-accent)')
  })
})
