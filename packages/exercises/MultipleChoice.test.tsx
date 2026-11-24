import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'

await import('../core/src/exercise/test.mocks')

globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as any

const { MultipleChoice } = await import('./MultipleChoice')

const stored = (id: string) => JSON.parse(localStorage.getItem(`/:${id}:0`) ?? 'null')?.[0]
const choose = (label: string) => fireEvent.click(screen.getByLabelText(label))
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Soumettre' }))
const labels = () => screen.getAllByRole('radio').map((el) => el.parentElement?.textContent)

const choices = { a: 'Alpha', b: 'Beta', c: 'Gamma', d: 'Delta' }

describe('MultipleChoice with an answer', () => {
  test('a single answer renders radio buttons and grades the selection', async () => {
    render(() => <MultipleChoice id="single" prompt={<p>?</p>} choices={choices} answer="b" />)
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(4))
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    choose('Alpha')
    choose('Beta')
    submit()
    await waitFor(() => expect(stored('single')).toMatchObject({ correct: true }))
    expect(stored('single').state).toEqual({ selection: ['b'] })
  })

  test('several answers render checkboxes and require all of them', async () => {
    render(() => (
      <MultipleChoice id="several" prompt={<p>?</p>} choices={choices} answer={['a', 'c']} />
    ))
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(4))
    choose('Alpha')
    submit()
    await waitFor(() => expect(stored('several')).toMatchObject({ correct: false }))
  })
})

describe('MultipleChoice with a grade function', () => {
  test('still grades with the function', async () => {
    render(() => (
      <MultipleChoice
        id="grade"
        prompt={<p>?</p>}
        choices={choices}
        grade={(sel) => sel.equals(['d'])}
      />
    ))
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(4))
    choose('Delta')
    submit()
    await waitFor(() => expect(stored('grade')).toMatchObject({ correct: true }))
  })
})

describe('MultipleChoice with shuffle', () => {
  const order = async (id: string, shuffle: boolean) => {
    const { unmount } = render(() => (
      <MultipleChoice id={id} prompt={<p>?</p>} choices={choices} answer="a" shuffle={shuffle} />
    ))
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(4))
    const result = labels()
    unmount()
    return result
  }

  test('keeps the given order without shuffle', async () => {
    expect(await order('ordered', false)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta'])
  })

  test('shuffles in the same order on every render', async () => {
    const first = await order('shuffled', true)
    expect(first.toSorted()).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma'])
    expect(await order('shuffled', true)).toEqual(first)
  })
})
