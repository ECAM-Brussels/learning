import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'

await import('../../../../../../packages/core/src/exercise/test.mocks')

globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
} as any

const { DependentOrIndependent, Parallel } = await import('./vectors.exercises')

const stored = (id: string) => JSON.parse(localStorage.getItem(`/:${id}:0`) ?? 'null')?.[0]
const choose = (label: string) => fireEvent.click(screen.getAllByLabelText(label).at(-1)!)
const submit = () => fireEvent.click(screen.getAllByRole('button', { name: 'Soumettre' }).at(-1)!)

describe('DependentOrIndependent', () => {
  test('saves the vectors and grades independent vectors', async () => {
    render(() => <DependentOrIndependent id="independent" x={[2, -1]} y={[4, 1]} />)
    await waitFor(() => screen.getByLabelText('Linearly independent'))
    choose('Linearly independent')
    submit()
    await waitFor(() => expect(stored('independent')).toMatchObject({ correct: true }))
    expect(stored('independent').state).toEqual({ selection: ['independent'] })
  })

  test('asks whether dependent vectors are parallel after a wrong answer', async () => {
    render(() => <DependentOrIndependent id="dependent" x={[1, 2]} y={[3, 6]} />)
    await waitFor(() => screen.getByLabelText('Linearly independent'))
    choose('Linearly independent')
    submit()
    await waitFor(() => expect(stored('dependent')).toMatchObject({ correct: false }))
    await waitFor(() => screen.getByLabelText('Not parallel'))
  })
})

describe('Parallel', () => {
  test('makes the student draw the vectors after "not parallel"', async () => {
    render(() => <Parallel id="parallel" x={[1, 2]} y={[3, 6]} />)
    await waitFor(() => screen.getByLabelText('Not parallel'))
    choose('Not parallel')
    submit()
    await waitFor(() => expect(stored('parallel')).toMatchObject({ correct: false }))
    await waitFor(() => screen.getByText(/drag the heads of the arrows/))
  })

  test('ends after the drawing even when the answer is still wrong', async () => {
    render(() => <Parallel id="after" x={[1, 2]} y={[3, 6]} afterDrawing />)
    await waitFor(() => screen.getByText(/Look at your drawing/))
    choose('Not parallel')
    submit()
    await waitFor(() => screen.getByText(/same line through the origin/))
    expect(screen.queryByText(/drag the heads/)).toBeNull()
  })
})
