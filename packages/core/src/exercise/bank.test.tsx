import { render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'

await import('./test.mocks')

globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as any

const { createQuestionBank, defineQuestions } = await import('./bank')
const { createStep } = await import('./base')
const { createRandom } = await import('../random')

const Sum = createStep({
  schema: { data: { a: 'number', b: 'number' }, inputs: { answer: 'string' } } as const,
  grade: ({ data, inputs }) => Number(inputs.answer) === data.a + data.b,
  prompt: (p) => (
    <p data-testid="sum">
      {p.data.a} + {p.data.b} = ?{p.inputs.answer}
    </p>
  ),
})

const Product = createStep({
  schema: { data: { x: 'number', y: 'number' }, inputs: { answer: 'string' } } as const,
  grade: ({ data, inputs }) => Number(inputs.answer) === data.x * data.y,
  prompt: (p) => (
    <p data-testid="product">
      {p.data.x} × {p.data.y} = ?{p.inputs.answer}
    </p>
  ),
})

const bank = createQuestionBank((question) => ({
  small: question({
    step: Sum,
    tags: ['easy'],
    generate: (random) => ({ n: random.int(1, 10) }),
    render: ({ n }) => ({ a: n, b: 1 }),
  }),
  big: question({
    step: Sum,
    tags: ['hard'],
    generate: (random) => ({ n: random.int(100, 1000) }),
    render: ({ n }) => ({ a: n, b: n }),
  }),
  product: question({
    step: Product,
    tags: ['multiplication'],
    generate: (random) => ({ n: random.int(2, 10) }),
    render: ({ n }) => ({ x: n, y: 3 }),
  }),
}))

describe('createRandom', () => {
  test('the same seed gives the same sequence', () => {
    const draw = (seed: string) => {
      const random = createRandom(seed)
      return Array.from({ length: 5 }, () => random.int(0, 1000))
    }
    expect(draw('a')).toEqual(draw('a'))
    expect(draw('a')).not.toEqual(draw('b'))
  })

  test('different integer seeds give different sequences', () => {
    const first = (seed: number) => createRandom(seed).int(0, 2 ** 30)
    expect(new Set([0, 1, 2, 3, 4].map(first)).size).toBe(5)
  })

  test('int excludes its upper bound', () => {
    const random = createRandom(1)
    const values = new Set(Array.from({ length: 1000 }, () => random.int(2, 5)))
    expect([...values].sort()).toEqual([2, 3, 4])
  })

  test('shuffle returns a permutation', () => {
    const shuffled = createRandom('x').shuffle([1, 2, 3, 4, 5])
    expect(shuffled.toSorted()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('createQuestionBank', () => {
  test('generate is reproducible from a seed', () => {
    expect(bank.generate({}, 42)).toEqual(bank.generate({}, 42))
  })

  test('generate only draws from the requested tags or kinds', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(bank.generate({ tags: ['easy'] }, seed).kind).toBe('small')
      expect(bank.generate({ kinds: ['big'] }, seed).kind).toBe('big')
    }
  })

  test('tags are typed from the bank', () => {
    // @ts-expect-error: no question has this tag
    expect(() => bank.generate({ tags: ['typo'] })).toThrow()
  })

  test('render turns parameters into the data of the step', () => {
    expect(bank.render({ kind: 'big', params: { n: 7 } })).toEqual({ a: 7, b: 7 })
  })

  test('Practice renders questions of the requested tags', async () => {
    render(() => <bank.Practice id="practice-easy" tags={['easy']} />)
    await waitFor(() => expect(screen.getByTestId('sum')).toHaveTextContent(/^\d \+ 1 = \?/))
  })

  test('a question can be answered with its own step', async () => {
    render(() => <bank.Practice id="practice-product" kinds={['product']} />)
    await waitFor(() => expect(screen.getByTestId('product')).toHaveTextContent(/^\d+ × 3 = \?/))
  })

  test('Practice restores a saved question with its own step', async () => {
    localStorage.setItem(
      '/:practice-saved-step:0',
      JSON.stringify([
        { data: { kind: 'product', params: { n: 4 } }, state: {}, submitted: false },
      ]),
    )
    render(() => <bank.Practice id="practice-saved-step" tags={['easy']} />)
    await waitFor(() => expect(screen.getByTestId('product')).toHaveTextContent('4 × 3 = ?'))
  })

  test('Practice restores a saved question instead of generating a new one', async () => {
    localStorage.setItem(
      '/:practice-saved:0',
      JSON.stringify([
        {
          data: { kind: 'big', params: { n: 500 } },
          state: { answer: '1000' },
          submitted: true,
          correct: true,
        },
      ]),
    )
    render(() => <bank.Practice id="practice-saved" tags={['easy']} />)
    await waitFor(() => expect(screen.getAllByTestId('sum')[0]).toHaveTextContent('500 + 500 = ?'))
  })
})

describe('composing question sets', () => {
  const sums = defineQuestions((question) => ({
    double: question({
      step: Sum,
      tags: ['sums'],
      generate: (random) => ({ n: random.int(1, 10) }),
      render: ({ n }) => ({ a: n, b: n }),
    }),
  }))
  const products = defineQuestions((question) => ({
    square: question({
      step: Product,
      tags: ['products'],
      generate: (random) => ({ n: random.int(1, 10) }),
      render: ({ n }) => ({ x: n, y: n }),
    }),
  }))
  const combined = createQuestionBank(sums, products)

  test('a bank draws from every set', () => {
    const drawn = new Set(Array.from({ length: 50 }, (_, seed) => combined.generate({}, seed).kind))
    expect([...drawn].sort()).toEqual(['double', 'square'])
  })

  test('each question is answered with its own step', async () => {
    render(() => <combined.Practice id="combined-products" tags={['products']} />)
    await waitFor(() => expect(screen.getByTestId('product')).toHaveTextContent(/^(\d+) × \1 = \?/))
  })

  test('tags and kinds are typed across sets', () => {
    expect(combined.generate({ tags: ['sums'] }, 1).kind).toBe('double')
    // @ts-expect-error: no question has this tag
    expect(() => combined.generate({ tags: ['typo'] })).toThrow()
  })

  test('every question must name its step', () => {
    defineQuestions((question) => ({
      // @ts-expect-error: the step is missing
      missing: question({
        generate: () => ({}),
        render: () => ({ a: 1, b: 1 }),
      }),
    }))
  })

  test('a kind defined in two sets is rejected', () => {
    expect(() => createQuestionBank(sums, sums)).toThrow(
      'The question kind "double" is defined twice',
    )
  })
})
