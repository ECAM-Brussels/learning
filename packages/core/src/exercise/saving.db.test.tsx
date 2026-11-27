import * as tables from '@learning/db/schema'
import { createTestDatabase } from '@learning/db/testing'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import * as web from '@solidjs/web'
import { afterAll, beforeEach, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { Show } from 'solid-js'
import './test.components'

const database = await createTestDatabase()
// A step saves at most once a second, and some tests answer several in a row.
setDefaultTimeout(20_000)

/** Who is logged in: the server functions act for them, and exercises save to the database. */
let user: { email: string; name: string } | null = null

mock.module('@learning/db', () => ({ db: database.db, tables }))
mock.module('@solidjs/web', () => ({
  ...web,
  getRequestEvent: () => ({ locals: { user }, request: { signal: undefined } }),
}))
mock.module('@solidjs/web/server-functions', () => ({ live: <T,>(fn: T) => fn }))
mock.module('virtual:solid-env/server', () => ({ env: { ADMINS: [] } }))
mock.module('../auth', () => ({ getUser: async () => user }))

/** Whether steps are on screen: a visible step saves itself unanswered, as it does on a page. */
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

const { createStep } = await import('./base')
const { Sequence } = await import('./sequence')

const Hint = createStep({
  name: 'test/hint',
  schema: { data: { n: 'number' }, inputs: { answer: 'string' } },
  prompt: (ctx) => (
    <>
      <p data-testid="hint">{ctx.data.n} + 0 = ?</p>
      {ctx.inputs.answer}
    </>
  ),
  grade: (ctx) => Number(ctx.inputs.answer) === ctx.data.n,
})

/** "a + b = ?", which asks "a + 0 = ?" after a wrong answer, then the question again. */
const Sum = createStep({
  name: 'test/sum',
  schema: { data: { a: 'number', b: 'number' }, inputs: { answer: 'string' } },
  prompt: (ctx) => (
    <>
      <p data-testid="question">
        {ctx.data.a} + {ctx.data.b} = ?
      </p>
      {ctx.inputs.answer}
    </>
  ),
  grade: (ctx) => Number(ctx.inputs.answer) === ctx.data.a + ctx.data.b,
  feedback: (ctx) => (
    <Show when={!ctx.correct}>
      <Hint n={ctx.data.a}>
        <ctx.Self />
      </Hint>
    </Show>
  ),
})

const student = { email: 'alice@student.ecam.be', name: 'Alice' }
const other = { email: 'bob@student.ecam.be', name: 'Bob' }

const rows = () =>
  database.db
    .select()
    .from(tables.steps)
    .orderBy(tables.steps.userEmail, tables.steps.sequencePosition, tables.steps.position)

/** Answers the `index`-th field on the page, and submits it. */
async function answer(value: string, index = 0) {
  const input = (await screen.findAllByRole('textbox'))[index] as HTMLInputElement
  input.value = value
  fireEvent.input(input)
  const buttons = screen.getAllByRole('button', { name: 'Soumettre' })
  fireEvent.click(buttons[buttons.length - 1]!)
}

const eventually = (assertion: () => unknown | Promise<unknown>) =>
  waitFor(assertion, { timeout: 5000 })

beforeEach(async () => {
  await database.clear()
  await database.addUser(student.email, student.name)
  await database.addUser(other.email, other.name)
  user = student
  visible = false
  localStorage.clear()
})

afterAll(() => database.close())

describe('exercises answered by a logged-in student', () => {
  test('save the answer to the database, and show it again on the next visit', async () => {
    const { unmount } = render(() => <Sum id="sum" a={2} b={3} />)
    await answer('5')
    await eventually(async () =>
      expect(await rows()).toMatchObject([
        {
          userEmail: student.email,
          url: '/',
          sequenceId: 'sum',
          sequencePosition: 0,
          position: 0,
          data: { a: 2, b: 3 },
          state: { answer: '5' },
          submitted: true,
          correct: true,
        },
      ]),
    )
    expect(localStorage.length).toBe(0)
    unmount()

    render(() => <Sum id="sum" a={2} b={3} />)
    await eventually(() => expect(screen.getByRole('textbox')).toHaveValue('5'))
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Soumettre' })).not.toBeInTheDocument()
  })

  test('save an exercise unanswered as soon as it is shown', async () => {
    visible = true
    render(() => <Sum id="opened" a={2} b={3} />)
    await eventually(async () =>
      expect(await rows()).toMatchObject([
        { sequenceId: 'opened', data: { a: 2, b: 3 }, state: {}, submitted: false, correct: null },
      ]),
    )
  })

  test('save each step of the remediation at its position, and restore the conversation', async () => {
    const { unmount } = render(() => <Sum id="remediation" a={2} b={3} />)
    await answer('4')
    expect(await screen.findByTestId('hint')).toHaveTextContent('2 + 0 = ?')
    await answer('2', 1)
    await eventually(() => expect(screen.getAllByTestId('question')).toHaveLength(2))
    await eventually(async () =>
      expect(await rows()).toMatchObject([
        { position: 0, state: { answer: '4' }, correct: false },
        { position: 1, data: { n: 2 }, state: { answer: '2' }, correct: true },
      ]),
    )
    await answer('5', 2)
    await eventually(async () =>
      expect((await rows())[2]).toMatchObject({
        position: 2,
        state: { answer: '5' },
        correct: true,
      }),
    )
    unmount()

    render(() => <Sum id="remediation" a={2} b={3} />)
    await eventually(() =>
      expect(
        screen.getAllByRole('textbox').map((input) => (input as HTMLInputElement).value),
      ).toEqual(['4', '2', '5']),
    )
  })

  test('save each exercise of a sequence at its position in the sequence', async () => {
    render(() => (
      <Sequence id="series">
        <Sum a={1} b={1} />
        <Sum a={2} b={2} />
      </Sequence>
    ))
    await eventually(() => expect(screen.getAllByTestId('question')).toHaveLength(2))
    await answer('4', 1)
    await eventually(async () =>
      expect(await rows()).toMatchObject([
        { sequenceId: 'series', sequencePosition: 1, data: { a: 2, b: 2 }, correct: true },
      ]),
    )
  })

  test('start again in the database when the exercise is reset', async () => {
    render(() => <Sum id="reset" a={2} b={3} />)
    await answer('4')
    await screen.findByTestId('hint')
    await answer('2', 1)
    await eventually(async () => expect(await rows()).toHaveLength(2))
    fireEvent.click(await screen.findByRole('button', { name: "Recommencer l'exercice" }))
    await eventually(async () =>
      expect(await rows()).toMatchObject([
        { position: 0, data: { a: 2, b: 3 }, submitted: false, correct: null },
      ]),
    )
    await eventually(() =>
      expect(screen.getAllByRole('button', { name: 'Soumettre' })).toHaveLength(1),
    )
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument()
  })

  test("don't show another student's answers", async () => {
    const { unmount } = render(() => <Sum id="private" a={2} b={3} />)
    await answer('5')
    await eventually(async () => expect(await rows()).toHaveLength(1))
    unmount()

    user = other
    render(() => <Sum id="private" a={2} b={3} />)
    await eventually(() =>
      expect(screen.getByRole('button', { name: 'Soumettre' })).toBeInTheDocument(),
    )
    expect(screen.getByRole('textbox')).toHaveValue('')
  })
})
