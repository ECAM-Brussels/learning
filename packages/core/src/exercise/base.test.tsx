import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import * as v from 'valibot'

/**
 * Module mocks — must be registered before `./base` is imported.
 *
 * - No user is logged in, so steps use the real localStorage-backed context.
 * - The remote context and auth/permission helpers pull in server-only modules.
 * - `@learning/components` is reduced to the pieces `Step` renders.
 */
const hasPermissions = mock(async (_: string[]) => true)
mock.module('../auth', () => ({ getUser: async () => null }))
mock.module('./context.remote', () => ({ default: {}, fetchSequence: async () => null }))
mock.module('../permissions', () => ({ hasPermissions }))
mock.module('@learning/components', async () => {
  const { Boundary } = await import('../../../components/src/Boundary')
  const { Form } = await import('../../../components/src/Form')
  const { FeedbackContext } = await import('../../../components/src/FeedbackContext')
  return {
    Boundary,
    Form,
    FeedbackContext,
    MathField: (props: any) => <input data-testid="math-field" {...props} />,
    Youtube: (props: { src: string }) => <div data-testid="video" data-src={props.src} />,
  }
})

/**
 * Controllable IntersectionObserver: nothing is visible unless a test opts in.
 */
let visible = false
globalThis.IntersectionObserver = class {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    if (visible) this.callback([{ isIntersecting: true, target } as any], this as any)
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as any

const { Step, createStep, createDerivedStep, schemas } = await import('./base')
const { StepContext } = await import('./context')
const { ExerciseOptions } = await import('./options')

const storageKey = (id: string, sequencePosition = 0) => `/:${id}:${sequencePosition}`
const stored = (id: string, sequencePosition = 0) =>
  JSON.parse(localStorage.getItem(storageKey(id, sequencePosition)) ?? 'null')

const schema = {
  data: { a: 'number', b: 'number' },
  inputs: { answer: 'string' },
} as const

type SumProps = Partial<Parameters<typeof Step<typeof schema>>[0]>

/**
 * A simple "a + b = ?" step. The prompt exposes its state through the DOM so tests can drive it.
 */
function SumStep(props: SumProps & { id: string }) {
  return (
    <Step
      schema={schema}
      data={{ a: 2, b: 3 }}
      grade={({ data, inputs }) => Number(inputs.answer) === data.a + data.b}
      prompt={(p) => (
        <div>
          <p data-testid="question">
            {p.data.a} + {p.data.b} = ?
          </p>
          {p.inputs.answer}
          <span data-testid="saved">{p.state.saved?.answer ?? ''}</span>
          <span data-testid="current">{p.state.current.answer ?? ''}</span>
          <span data-testid="correct">{String(p.state.correct)}</span>
        </div>
      )}
      feedback={(p) => (
        <div data-testid="feedback">
          {p.correct ? 'Bravo' : 'Faux'} ({p.inputs.answer})
        </div>
      )}
      {...props}
    />
  )
}

const answer = (value: string) => {
  const input = screen.getByRole('textbox') as HTMLInputElement
  input.value = value
  fireEvent.input(input)
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Soumettre' }))

beforeEach(() => {
  visible = false
  hasPermissions.mockClear()
  hasPermissions.mockImplementation(async () => true)
})

describe('schemas', () => {
  test('expr parses LaTeX strings into expressions', () => {
    const parsed = v.parse(schemas.expr, 'x^2')
    expect(parsed.json).toEqual(['Power', 'x', 2])
  })

  test('expr passes existing expressions through', () => {
    const parsed = v.parse(schemas.expr, 'x^2')
    expect(v.parse(schemas.expr, parsed).json).toEqual(parsed.json)
  })

  test('jsx accepts strings as-is', () => {
    expect(v.parse(schemas.jsx, 'hello')).toBe('hello')
  })

  test('jsx values that are not strings are dropped from JSON', () => {
    const el = document.createElement('span')
    const parsed = v.parse(schemas.jsx, el)
    expect(parsed).toBe(el)
    expect(JSON.stringify({ el: parsed })).toBe('{}')
  })

  test('primitive schemas validate their type', () => {
    expect(v.parse(schemas.number, 1)).toBe(1)
    expect(v.parse(schemas.boolean, true)).toBe(true)
    expect(v.parse(schemas.string, 's')).toBe('s')
    expect(() => v.parse(schemas.number, '1')).toThrow()
  })
})

describe('Step', () => {
  test('renders the prompt with static data and an input per schema field', async () => {
    render(() => <SumStep id="render" />)
    expect(await screen.findByTestId('question')).toHaveTextContent('2 + 3 = ?')
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Soumettre' })).toBeInTheDocument()
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
  })

  test('accepts data from a (possibly async) generator', async () => {
    render(() => <SumStep id="generator" data={async () => ({ a: 10, b: 20 })} />)
    expect(await screen.findByTestId('question')).toHaveTextContent('10 + 20 = ?')
  })

  test('updates the draft state when an input changes', async () => {
    render(() => <SumStep id="draft" />)
    await screen.findByRole('textbox')
    answer('7')
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('7'))
    expect(screen.getByTestId('saved')).toHaveTextContent('')
  })

  test('grades and saves a correct submission, then shows feedback and the next step', async () => {
    const grade = mock(({ data, inputs }: any) => Number(inputs.answer) === data.a + data.b)
    render(() => (
      <SumStep id="correct" grade={grade}>
        <p>Next step</p>
      </SumStep>
    ))
    await screen.findByRole('textbox')
    answer('5')
    submit()

    expect(await screen.findByTestId('feedback')).toHaveTextContent('Bravo (5)')
    expect(screen.getByText('Next step')).toBeInTheDocument()
    expect(grade).toHaveBeenCalledTimes(1)
    expect(grade.mock.calls[0]![0]).toEqual({ data: { a: 2, b: 3 }, inputs: { answer: '5' } })
    expect(stored('correct')).toEqual([
      { data: { a: 2, b: 3 }, state: { answer: '5' }, submitted: true, correct: true },
    ])
    // Once correct, the step can no longer be submitted
    expect(screen.queryByRole('button', { name: 'Soumettre' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
  })

  test('an incorrect submission shows negative feedback and hides the next step', async () => {
    render(() => (
      <SumStep id="incorrect">
        <p>Next step</p>
      </SumStep>
    ))
    await screen.findByRole('textbox')
    answer('4')
    submit()

    expect(await screen.findByTestId('feedback')).toHaveTextContent('Faux (4)')
    expect(screen.queryByText('Next step')).not.toBeInTheDocument()
    expect(stored('incorrect')[0]).toMatchObject({ submitted: true, correct: false })
    expect(screen.queryByRole('button', { name: 'Soumettre' })).not.toBeInTheDocument()
  })

  test('requires every result to be true when grade returns an array', async () => {
    render(() => <SumStep id="array" grade={() => [true, Promise.resolve(false)]} />)
    await screen.findByRole('textbox')
    answer('5')
    submit()
    expect(await screen.findByTestId('feedback')).toHaveTextContent('Faux')
    expect(stored('array')[0].correct).toBe(false)
  })

  test('allowResubmissions keeps the submit button after an incorrect answer', async () => {
    render(() => <SumStep id="resubmit" options={{ allowResubmissions: true }} />)
    await screen.findByRole('textbox')
    answer('4')
    submit()
    await screen.findByTestId('feedback')
    expect(screen.getByRole('button', { name: 'Soumettre' })).toBeInTheDocument()
  })

  test('initialState prefills the draft from data', async () => {
    render(() => (
      <SumStep id="initial-state" initialState={(data) => ({ answer: String(data.a) })} />
    ))
    expect(await screen.findByTestId('current')).toHaveTextContent('2')
  })

  test('saved state takes precedence over initialState', async () => {
    localStorage.setItem(
      storageKey('initial-state-saved'),
      JSON.stringify([{ data: { a: 2, b: 3 }, state: { answer: '9' }, submitted: false }]),
    )
    render(() => <SumStep id="initial-state-saved" initialState={() => ({ answer: 'default' })} />)
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('9'))
  })

  test('restores a saved submission from storage', async () => {
    localStorage.setItem(
      storageKey('restore'),
      JSON.stringify([
        { data: { a: 2, b: 3 }, state: { answer: '5' }, submitted: true, correct: true },
      ]),
    )
    render(() => <SumStep id="restore" />)
    expect(await screen.findByTestId('feedback')).toHaveTextContent('Bravo (5)')
    expect(screen.getByTestId('saved')).toHaveTextContent('5')
    expect(screen.getByTestId('correct')).toHaveTextContent('true')
    expect(screen.getByRole('textbox')).toHaveValue('5')
  })

  test('saved data overrides generated data, but not static data', async () => {
    const saved = [{ data: { a: 100, b: 200 }, state: {}, submitted: false }]
    localStorage.setItem(storageKey('gen-saved'), JSON.stringify(saved))
    localStorage.setItem(storageKey('static-saved'), JSON.stringify(saved))
    render(() => (
      <>
        <SumStep id="gen-saved" data={() => ({ a: 1, b: 1 })} />
        <SumStep id="static-saved" />
      </>
    ))
    await waitFor(() => {
      const questions = screen.getAllByTestId('question').map((q) => q.textContent)
      expect(questions).toEqual(['100 + 200 = ?', '2 + 3 = ?'])
    })
  })

  test('saves an empty attempt once the step becomes visible', async () => {
    visible = true
    render(() => <SumStep id="visible" />)
    await waitFor(() =>
      expect(stored('visible')).toEqual([{ data: { a: 2, b: 3 }, state: {}, submitted: false }]),
    )
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
  })

  test('readOnly hides the submit button and makes inputs read-only', async () => {
    render(() => <SumStep id="readonly" options={{ readOnly: true }} />)
    await screen.findByRole('textbox')
    expect(screen.queryByRole('button', { name: 'Soumettre' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
  })

  test('readOnly accepts a date, active once it has passed', async () => {
    render(() => (
      <>
        <SumStep id="past" options={{ readOnly: new Date(0) }} />
        <SumStep id="future" options={{ readOnly: new Date(Date.now() + 3_600_000) }} />
      </>
    ))
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(2))
    expect(screen.getAllByRole('button', { name: 'Soumettre' })).toHaveLength(1)
  })

  test('options are inherited from ExerciseOptions', async () => {
    render(() => (
      <ExerciseOptions readOnly>
        <SumStep id="inherited" />
      </ExerciseOptions>
    ))
    await screen.findByRole('textbox')
    expect(screen.queryByRole('button', { name: 'Soumettre' })).not.toBeInTheDocument()
  })

  test('options can be computed from the data', async () => {
    const options = mock((data: { a: number }) => ({ readOnly: data.a === 2 }))
    render(() => <SumStep id="options-fn" options={options} />)
    await screen.findByRole('textbox')
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Soumettre' })).not.toBeInTheDocument(),
    )
    expect(options).toHaveBeenCalledWith({ a: 2, b: 3 })
  })

  test('showFeedback: false hides feedback after submitting', async () => {
    render(() => <SumStep id="no-feedback" options={{ showFeedback: false }} />)
    await screen.findByRole('textbox')
    answer('5')
    submit()
    await waitFor(() => expect(stored('no-feedback')?.[0]?.submitted).toBe(true))
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
  })

  test('renders a video when the video option is set', async () => {
    render(() => <SumStep id="video" options={{ video: 'https://example.com/v' }} />)
    expect(await screen.findByTestId('video')).toHaveAttribute('data-src', 'https://example.com/v')
  })

  test('children can be a function of data and inputs', async () => {
    render(() => (
      <SumStep id="children-fn">
        {(p) => (
          <p data-testid="next">
            {p.data.a + p.data.b} = {p.inputs.answer}
          </p>
        )}
      </SumStep>
    ))
    await screen.findByRole('textbox')
    answer('5')
    submit()
    expect(await screen.findByTestId('next')).toHaveTextContent('5 = 5')
  })

  test('calls onChange with the stored steps of its sequence position', async () => {
    const onChange = mock()
    render(() => <SumStep id="on-change" onChange={onChange} />)
    await screen.findByRole('textbox')
    answer('5')
    submit()
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        0: { data: { a: 2, b: 3 }, state: { answer: '5' }, submitted: true, correct: true },
      }),
    )
  })

  test('nested steps are stored at the next position', async () => {
    render(() => (
      <SumStep id="nested">
        <SumStep id="nested" data={{ a: 1, b: 1 }} />
      </SumStep>
    ))
    await screen.findByRole('textbox')
    answer('5')
    submit()
    await waitFor(() => expect(screen.getAllByTestId('question')).toHaveLength(2))
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    inputs[1]!.value = '2'
    fireEvent.input(inputs[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'Soumettre' }))
    await waitFor(() => expect(stored('nested')).toHaveLength(2))
    expect(stored('nested')[1]).toMatchObject({
      data: { a: 1, b: 1 },
      state: { answer: '2' },
      correct: true,
    })
  })

  test('uses the sequence position from StepContext', async () => {
    render(() => (
      <StepContext
        value={() => ({ url: '/', sequenceId: 'seq', sequencePosition: 3, position: 0 })}
      >
        <SumStep id="seq" />
      </StepContext>
    ))
    await screen.findByRole('textbox')
    answer('5')
    submit()
    await waitFor(() => expect(stored('seq', 3)?.[0]?.correct).toBe(true))
  })

  describe('reset', () => {
    const seed = (id: string) =>
      localStorage.setItem(
        storageKey(id),
        JSON.stringify([
          { data: { a: 2, b: 3 }, state: { answer: '4' }, submitted: true, correct: false },
        ]),
      )

    test('resets a submitted exercise', async () => {
      seed('reset')
      render(() => <SumStep id="reset" />)
      const button = await screen.findByRole('button', { name: "Recommencer l'exercice" })
      expect(hasPermissions).toHaveBeenCalledWith(['exercise:deleteOwn'])
      fireEvent.click(button)
      expect(await screen.findByRole('button', { name: 'Soumettre' })).toBeInTheDocument()
      expect(stored('reset')).toEqual([
        { data: { a: 2, b: 3 }, state: { answer: '4' }, submitted: false },
      ])
      expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
    })

    test('is unavailable without permission', async () => {
      seed('no-permission')
      hasPermissions.mockImplementation(async () => false)
      render(() => <SumStep id="no-permission" />)
      await screen.findByTestId('feedback')
      await waitFor(() => expect(hasPermissions).toHaveBeenCalled())
      expect(screen.queryByRole('button', { name: "Recommencer l'exercice" })).toBeNull()
    })

    test('is unavailable when allowResets is false', async () => {
      seed('no-resets')
      render(() => <SumStep id="no-resets" options={{ allowResets: false }} />)
      await screen.findByTestId('feedback')
      expect(screen.queryByRole('button', { name: "Recommencer l'exercice" })).toBeNull()
    })

    test('is unavailable before submitting', async () => {
      render(() => <SumStep id="unsubmitted" />)
      await screen.findByRole('textbox')
      expect(screen.queryByRole('button', { name: "Recommencer l'exercice" })).toBeNull()
    })
  })
})

describe('createStep', () => {
  const Sum = createStep({
    schema,
    grade: ({ data, inputs }) => Number(inputs.answer) === data.a + data.b,
    prompt: (p) => (
      <div>
        <p data-testid="question">
          {p.data.a} + {p.data.b} = ?
        </p>
        {p.inputs.answer}
      </div>
    ),
    feedback: (p) => <div data-testid="feedback">{p.correct ? 'Bravo' : 'Faux'}</div>,
    options: { allowResubmissions: true },
  })

  test('exposes its config', () => {
    expect(Sum.config.schema).toBe(schema)
  })

  test('takes data as individual props', async () => {
    render(() => <Sum id="create-props" a={4} b={5} />)
    expect(await screen.findByTestId('question')).toHaveTextContent('4 + 5 = ?')
  })

  test('takes data through the data prop', async () => {
    render(() => <Sum id="create-data" data={() => ({ a: 6, b: 7 })} />)
    expect(await screen.findByTestId('question')).toHaveTextContent('6 + 7 = ?')
  })

  test('merges step options with prop options, props taking precedence', async () => {
    render(() => <Sum id="create-options" a={1} b={1} options={{ showFeedback: false }} />)
    await screen.findByRole('textbox')
    answer('3')
    submit()
    await waitFor(() => expect(stored('create-options')?.[0]?.correct).toBe(false))
    // allowResubmissions from the step config is kept
    expect(await screen.findByRole('button', { name: 'Soumettre' })).toBeInTheDocument()
    // showFeedback from props applies
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
  })

  test('feedback can be overridden by props', async () => {
    render(() => (
      <Sum
        id="create-feedback"
        a={1}
        b={1}
        feedback={(p) => <div data-testid="feedback">custom {String(p.correct)}</div>}
      />
    ))
    await screen.findByRole('textbox')
    answer('2')
    submit()
    expect(await screen.findByTestId('feedback')).toHaveTextContent('custom true')
  })
})

describe('createDerivedStep', () => {
  const Sum = createStep({
    schema,
    grade: ({ data, inputs }) => Number(inputs.answer) === data.a + data.b,
    prompt: (p) => (
      <div>
        <p data-testid="question">
          {p.data.a} + {p.data.b} = ?
        </p>
        {p.inputs.answer}
      </div>
    ),
    feedback: (p) => (
      <div data-testid="feedback">
        {p.correct ? 'Bravo' : 'Faux'} {p.data.a}+{p.data.b}
      </div>
    ),
  })
  const Double = createDerivedStep(Sum, { n: 'number' }, ({ n }) => ({ a: n, b: n }))

  test('transforms its data into the base step data', async () => {
    render(() => <Double id="derived" n={4} />)
    expect(await screen.findByTestId('question')).toHaveTextContent('4 + 4 = ?')
  })

  test('grades and gives feedback with the transformed data, but stores the raw data', async () => {
    render(() => <Double id="derived-grade" n={4} />)
    await screen.findByRole('textbox')
    answer('8')
    submit()
    expect(await screen.findByTestId('feedback')).toHaveTextContent('Bravo 4+4')
    expect(stored('derived-grade')[0]).toMatchObject({ data: { n: 4 }, correct: true })
  })

  test('validates the transformed data against the base schema', async () => {
    const Broken = createDerivedStep(Sum, { n: 'number' }, ({ n }) => ({ a: n, b: 'x' as any }))
    const error = console.error
    console.error = () => {}
    try {
      render(() => <Broken id="derived-broken" n={1} />)
      expect(await screen.findByText('Erreur')).toBeInTheDocument()
    } finally {
      console.error = error
    }
  })
})

describe('union data schemas', () => {
  const Shape = createStep({
    schema: {
      data: v.variant('kind', [
        v.object({ kind: v.literal('square'), side: v.number() }),
        v.object({ kind: v.literal('rect'), width: v.number(), height: v.number() }),
      ]),
      inputs: { answer: 'string' },
    },
    grade: ({ data, inputs }) =>
      Number(inputs.answer) ===
      (data.kind === 'square' ? data.side ** 2 : data.width * data.height),
    prompt: (p) => (
      <div>
        <p data-testid="question">
          {p.data.kind === 'square'
            ? `square ${p.data.side}`
            : `rect ${p.data.width}x${p.data.height}`}
        </p>
        {p.inputs.answer}
      </div>
    ),
    feedback: (p) => <div data-testid="feedback">{p.correct ? 'Bravo' : 'Faux'}</div>,
  })

  test('accepts a valibot union/variant schema as data', async () => {
    render(() => <Shape id="union-square" kind="square" side={3} />)
    expect(await screen.findByTestId('question')).toHaveTextContent('square 3')
    answer('9')
    submit()
    expect(await screen.findByTestId('feedback')).toHaveTextContent('Bravo')
    expect(stored('union-square')[0]).toMatchObject({ data: { kind: 'square', side: 3 } })
  })

  test('narrows on each union member', async () => {
    render(() => <Shape id="union-rect" data={{ kind: 'rect', width: 2, height: 5 }} />)
    expect(await screen.findByTestId('question')).toHaveTextContent('rect 2x5')
  })

  test('an array of raw shapes is shorthand for a union of objects', async () => {
    const Either = createStep({
      schema: {
        data: [{ a: 'number', b: 'number' }, { label: 'string' }],
        inputs: { answer: 'string' },
      },
      grade: () => true,
      prompt: (p) => (
        <p data-testid="question">
          {'label' in p.data ? p.data.label : `${p.data.a} + ${p.data.b}`}
        </p>
      ),
    })
    render(() => (
      <>
        <Either id="union-raw-1" a={1} b={2} />
        <Either id="union-raw-2" label="hello" />
      </>
    ))
    const questions = await screen.findAllByTestId('question')
    expect(questions.map((q) => q.textContent)).toEqual(['1 + 2', 'hello'])
  })

  test('a derived step can take a union as its own data schema', async () => {
    const Area = createDerivedStep(
      Shape,
      [{ square: 'number' }, { w: 'number', h: 'number' }],
      (data) =>
        'square' in data
          ? { kind: 'square' as const, side: data.square }
          : { kind: 'rect' as const, width: data.w, height: data.h },
    )
    render(() => <Area id="union-derived" w={3} h={4} />)
    expect(await screen.findByTestId('question')).toHaveTextContent('rect 3x4')
  })
})
