import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import type { JSX } from '@solidjs/web'
import { describe, expect, mock, test } from 'bun:test'
import { createMemo, useContext } from 'solid-js'

await import('./test.mocks')

globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as any

const { Sequence } = await import('./sequence')
const { Step } = await import('./base')
const { StepContext } = await import('./context')

const schema = { data: { n: 'number' }, inputs: { answer: 'string' } } as const

/**
 * Records every instantiation along with the StepContext it saw, then renders a real Step.
 */
function makeProbe() {
  const created: { n: number; ctx: unknown }[] = []
  function Probe(props: { n: number; wait?: Promise<unknown> }) {
    created.push({ n: props.n, ctx: useContext(StepContext)?.() ?? null })
    const waited = createMemo(async () => (props.wait ? await props.wait : null))
    return (
      <Step
        schema={schema}
        data={{ n: props.n }}
        grade={() => true}
        prompt={(p) => (
          <p data-testid="question">
            #{p.data.n} {String(waited())}
            <StepPosition />
          </p>
        )}
        feedback={() => null}
      />
    )
  }
  return { created, Probe }
}

/** Exposes the StepContext a Step hands to its descendants. */
function StepPosition() {
  const ctx = useContext(StepContext)
  return <span data-testid="position">{String(ctx?.().sequencePosition)}</span>
}

describe('Sequence with static children', () => {
  test('instantiates each child exactly once', async () => {
    const { created, Probe } = makeProbe()
    render(() => (
      <Sequence id="once">
        <Probe n={0} />
        <Probe n={1} />
        <Probe n={2} />
      </Sequence>
    ))
    await waitFor(() => expect(screen.getAllByTestId('question')).toHaveLength(3))
    expect(created.map((c) => c.n)).toEqual([0, 1, 2])
  })

  test('gives each child its own sequence position', async () => {
    const { Probe } = makeProbe()
    render(() => (
      <Sequence id="positions">
        <Probe n={0} />
        <Probe n={1} />
        <Probe n={2} />
      </Sequence>
    ))
    await waitFor(() => expect(screen.getAllByTestId('position')).toHaveLength(3))
    expect(screen.getAllByTestId('position').map((el) => el.textContent)).toEqual(['0', '1', '2'])
  })

  test('children are created inside the sequence, under its loading boundary', async () => {
    const { created, Probe } = makeProbe()
    let resolve!: (v: string) => void
    const wait = new Promise<string>((r) => (resolve = r))
    render(() => (
      <Sequence id="boundary">
        <Probe n={0} wait={wait} />
        <Probe n={1} />
      </Sequence>
    ))
    // Children see the sequence's StepContext, so they were created beneath it
    await waitFor(() => expect(created).toHaveLength(2))
    expect(created.every((c) => (c.ctx as any)?.sequenceId === 'boundary')).toBe(true)
    // A pending child suspends a boundary inside the sequence, not one above it
    expect(await screen.findByText(/^Chargement/)).toBeInTheDocument()
    resolve('ready')
    await waitFor(() => expect(screen.getAllByTestId('question')[0]).toHaveTextContent('#0 ready'))
    expect(created).toHaveLength(2)
  })

  test('steps nested inside a step do not claim a sequence position', async () => {
    const { Probe } = makeProbe()
    function WithNested(props: { n: number }) {
      return (
        <Step
          schema={schema}
          data={{ n: props.n }}
          grade={() => true}
          prompt={() => (
            <div>
              <StepPosition />
              <Probe n={99} />
            </div>
          )}
          feedback={() => null}
        />
      )
    }
    render(() => (
      <Sequence id="nested">
        <WithNested n={0} />
        <Probe n={1} />
      </Sequence>
    ))
    // outer step, nested step (inherits its parent's position), second step
    await waitFor(() => expect(screen.getAllByTestId('position')).toHaveLength(3))
    expect(screen.getAllByTestId('position').map((el) => el.textContent)).toEqual(['0', '0', '1'])
  })
})

/**
 * Pagination switches pages inside a view transition, which happy-dom doesn't implement.
 */
;(document as any).startViewTransition ??= (callback: () => void) => {
  callback()
  return {
    finished: Promise.resolve(),
    ready: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
  }
}

const sumSchema = { data: { a: 'number', b: 'number' }, inputs: { answer: 'string' } } as const

/** An "a + b = ?" step exposing its sequence position, with an optional nested step. */
function Sum(props: { a: number; b?: number; children?: JSX.Element }) {
  return (
    <Step
      schema={sumSchema}
      data={{ a: props.a, b: props.b ?? 1 }}
      grade={({ data, inputs }) => Number(inputs.answer) === data.a + data.b}
      prompt={(p) => (
        <p data-testid="sum">
          {p.data.a} + {p.data.b} = ?
          <StepPosition />
          {p.inputs.answer}
        </p>
      )}
      feedback={(p) => <span data-testid="feedback">{p.correct ? 'Bravo' : 'Faux'}</span>}
    >
      {props.children}
    </Step>
  )
}

const storageKey = (id: string, sequencePosition: number) => `/:${id}:${sequencePosition}`
const stored = (id: string, sequencePosition: number) =>
  JSON.parse(localStorage.getItem(storageKey(id, sequencePosition)) ?? 'null')

/** The page of the pagination containing an element. */
const pageOf = (el: HTMLElement) => {
  let page = el
  while (page.parentElement && !page.parentElement.classList.contains('mx-8')) {
    page = page.parentElement
  }
  return page
}
const sums = () => screen.getAllByTestId('sum')
const positions = () => screen.getAllByTestId('position').map((el) => el.textContent)
const answerIn = (el: HTMLElement, value: string) => {
  const input = within(pageOf(el)).getAllByRole('textbox').at(-1) as HTMLInputElement
  input.value = value
  fireEvent.input(input)
  fireEvent.click(within(pageOf(el)).getByRole('button', { name: 'Soumettre' }))
}
const pageButton = (n: number) => screen.getByRole('button', { name: String(n) })

describe('Sequence with static children: behaviour', () => {
  test('renders one page per child, and only the current page is shown', async () => {
    render(() => (
      <Sequence id="pages">
        <Sum a={1} />
        <Sum a={2} />
        <Sum a={3} />
      </Sequence>
    ))
    await waitFor(() => expect(sums()).toHaveLength(3))
    expect([1, 2, 3].map((n) => pageButton(n))).toHaveLength(3)
    expect(sums().map((el) => pageOf(el).classList.contains('hidden'))).toEqual([false, true, true])
    fireEvent.click(pageButton(3))
    await waitFor(() =>
      expect(sums().map((el) => pageOf(el).classList.contains('hidden'))).toEqual([
        true,
        true,
        false,
      ]),
    )
  })

  test('accepts a single child', async () => {
    render(() => (
      <Sequence id="single">
        <Sum a={1} />
      </Sequence>
    ))
    await waitFor(() => expect(positions()).toEqual(['0']))
    expect(pageButton(1)).toBeInTheDocument()
  })

  test('saves each child at its own sequence position', async () => {
    render(() => (
      <Sequence id="save">
        <Sum a={1} />
        <Sum a={2} />
      </Sequence>
    ))
    await waitFor(() => expect(sums()).toHaveLength(2))
    answerIn(sums()[1]!, '3')
    await waitFor(() => expect(stored('save', 1)?.[0]).toMatchObject({ correct: true }))
    expect(stored('save', 1)[0]).toMatchObject({ data: { a: 2, b: 1 }, state: { answer: '3' } })
    expect(stored('save', 0)).toBeNull()
    answerIn(sums()[0]!, '0')
    await waitFor(() => expect(stored('save', 0)?.[0]).toMatchObject({ correct: false }))
  })

  test('restores each child from its own sequence position', async () => {
    localStorage.setItem(
      storageKey('restore', 1),
      JSON.stringify([
        { data: { a: 2, b: 1 }, state: { answer: '3' }, submitted: true, correct: true },
      ]),
    )
    render(() => (
      <Sequence id="restore">
        <Sum a={1} />
        <Sum a={2} />
      </Sequence>
    ))
    await waitFor(() => expect(screen.getAllByTestId('feedback')).toHaveLength(1))
    expect(within(pageOf(sums()[1]!)).getByTestId('feedback')).toHaveTextContent('Bravo')
    expect(within(pageOf(sums()[1]!)).getByRole('textbox')).toHaveValue('3')
    expect(within(pageOf(sums()[0]!)).getByRole('textbox')).toHaveValue('')
  })

  test('colours the page buttons by progress', async () => {
    render(() => (
      <Sequence id="progress">
        <Sum a={1} />
        <Sum a={2} />
        <Sum a={3} />
      </Sequence>
    ))
    await waitFor(() => expect(sums()).toHaveLength(3))
    answerIn(sums()[0]!, '2')
    answerIn(sums()[1]!, '0')
    await waitFor(() => {
      expect(pageButton(1)).toHaveClass('bg-green-100')
      expect(pageButton(2)).toHaveClass('bg-red-100')
    })
    expect(pageButton(3)).not.toHaveClass('bg-green-100', 'bg-red-100')
  })

  test('passes its options down to the steps', async () => {
    render(() => (
      <Sequence id="options" options={{ readOnly: true }}>
        <Sum a={1} />
        <Sum a={2} />
      </Sequence>
    ))
    await waitFor(() => expect(sums()).toHaveLength(2))
    expect(screen.queryByRole('button', { name: 'Soumettre' })).not.toBeInTheDocument()
  })

  test('without feedback, answered pages are marked but not graded', async () => {
    render(() => (
      <Sequence id="no-feedback" options={{ showFeedback: false }}>
        <Sum a={1} />
        <Sum a={2} />
      </Sequence>
    ))
    await waitFor(() => expect(sums()).toHaveLength(2))
    answerIn(sums()[0]!, '0')
    await waitFor(() => expect(pageButton(1)).toHaveClass('bg-sky-50'))
    expect(pageButton(1)).not.toHaveClass('bg-red-100')
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
  })

  test("steps revealed as a step's children share its sequence position", async () => {
    render(() => (
      <Sequence id="children">
        <Sum a={1}>
          <Sum a={10} />
        </Sum>
        <Sum a={2} />
      </Sequence>
    ))
    await waitFor(() => expect(sums()).toHaveLength(2))
    answerIn(sums()[0]!, '2')
    await waitFor(() => expect(sums()).toHaveLength(3))
    expect(positions()).toEqual(['0', '0', '1'])
    answerIn(sums()[1]!, '11')
    await waitFor(() => expect(stored('children', 0)).toHaveLength(2))
    expect(stored('children', 0)[1]).toMatchObject({ data: { a: 10, b: 1 }, correct: true })
    expect(stored('children', 1)).toBeNull()
  })

  test('a child rendering several steps gives each its own position', async () => {
    const Pair = () => (
      <>
        <Sum a={1} />
        <Sum a={2} />
      </>
    )
    render(() => (
      <Sequence id="pair">
        <Pair />
        <Sum a={3} />
      </Sequence>
    ))
    await waitFor(() => expect(positions()).toEqual(['0', '1', '2']))
  })

  test('sibling sequences count positions independently', async () => {
    render(() => (
      <>
        <Sequence id="left">
          <Sum a={1} />
          <Sum a={2} />
        </Sequence>
        <Sequence id="right">
          <Sum a={3} />
          <Sum a={4} />
        </Sequence>
      </>
    ))
    await waitFor(() => expect(positions()).toEqual(['0', '1', '0', '1']))
  })
})

describe('Sequence with a next component', () => {
  test('starts with a single page at position 0', async () => {
    const calls: { position: number; progress: unknown }[] = []
    function Next(props: { position: number; progress: Record<number, unknown> }) {
      calls.push({ position: props.position, progress: { ...props.progress } })
      return <Sum a={props.position} />
    }
    render(() => <Sequence id="next-start" next={Next} />)
    await waitFor(() => expect(positions()).toEqual(['0']))
    expect(calls).toEqual([{ position: 0, progress: {} }])
  })

  test('adds a page once the current one is answered', async () => {
    render(() => <Sequence id="next-grow" next={(props) => <Sum a={props.position} />} />)
    await waitFor(() => expect(sums()).toHaveLength(1))
    answerIn(sums()[0]!, '1')
    await waitFor(() => expect(positions()).toEqual(['0', '1']))
    expect(stored('next-grow', 0)?.[0]).toMatchObject({ correct: true })
    answerIn(sums()[1]!, '0')
    await waitFor(() => expect(stored('next-grow', 1)?.[0]).toMatchObject({ correct: false }))
    await waitFor(() => expect(positions()).toEqual(['0', '1', '2']))
  })

  test('restores one page per answered position, plus the next', async () => {
    for (const [i, correct] of [true, false].entries()) {
      localStorage.setItem(
        storageKey('next-restore', i),
        JSON.stringify([
          { data: { a: i, b: 1 }, state: { answer: '1' }, submitted: true, correct },
        ]),
      )
    }
    render(() => <Sequence id="next-restore" next={(props) => <Sum a={props.position} />} />)
    await waitFor(() => expect(positions()).toEqual(['0', '1', '2']))
    expect(pageButton(1)).toHaveClass('bg-green-100')
    expect(pageButton(2)).toHaveClass('bg-red-100')
  })

  test('does not recreate existing pages when a page is added', async () => {
    const created: number[] = []
    function Next(props: { position: number }) {
      created.push(props.position)
      return <Sum a={props.position} />
    }
    render(() => <Sequence id="next-stable" next={Next} />)
    await waitFor(() => expect(sums()).toHaveLength(1))
    answerIn(sums()[0]!, '1')
    await waitFor(() => expect(sums()).toHaveLength(2))
    expect(created).toEqual([0, 1])
  })
})

describe('Sequence with an exercise and a next generator', () => {
  test('renders the exercise with the props generated for each position', async () => {
    const next = mock(async ({ position }: { position: number; progress: object }) => ({
      a: position * 10,
    }))
    render(() => <Sequence id="gen" exercise={Sum} next={next} />)
    await waitFor(() => expect(sums()).toHaveLength(1))
    expect(sums()[0]).toHaveTextContent('0 + 1 = ?')
    expect(next.mock.calls[0]![0]).toEqual({ position: 0, progress: {} })
    answerIn(sums()[0]!, '1')
    await waitFor(() => expect(sums()).toHaveLength(2))
    expect(sums()[1]).toHaveTextContent('10 + 1 = ?')
    expect(positions()).toEqual(['0', '1'])
    answerIn(sums()[1]!, '11')
    await waitFor(() => expect(stored('gen', 1)?.[0]).toMatchObject({ correct: true }))
  })
})
