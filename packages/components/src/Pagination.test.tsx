import { fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { flush } from 'solid-js'
import { Pagination } from './Pagination'

const pages = [() => <p>Page A</p>, () => <p>Page B</p>, () => <p>Page C</p>]
const visible = () =>
  ['Page A', 'Page B', 'Page C'].filter(
    (text) => screen.queryByText(text) && !screen.getByText(text).closest('div.hidden'),
  )
const page = (n: number) => screen.getByRole('button', { name: String(n) })
const click = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }))
  flush()
}

describe('Pagination', () => {
  test('shows the first page by default and a button per page', () => {
    render(() => <Pagination>{pages}</Pagination>)
    expect(visible()).toEqual(['Page A'])
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      '‹',
      '1',
      '2',
      '3',
      '›',
    ])
    expect(page(1)).toHaveClass('font-bold')
  })

  test('starts at the current page', () => {
    render(() => <Pagination current={2}>{pages}</Pagination>)
    expect(visible()).toEqual(['Page B'])
  })

  test('moves by number, previous and next, without going past either end', () => {
    const onChange = mock()
    render(() => <Pagination onChange={onChange}>{pages}</Pagination>)
    click('‹')
    expect(visible()).toEqual(['Page A'])
    click('3')
    expect(visible()).toEqual(['Page C'])
    click('›')
    expect(visible()).toEqual(['Page C'])
    click('‹')
    expect(visible()).toEqual(['Page B'])
    expect(page(2)).toHaveClass('font-bold')
    expect(page(3)).not.toHaveClass('font-bold')
    expect(onChange.mock.calls.map(([n]) => n)).toEqual([3, 2])
  })

  test('colours pages by progress, or only marks them answered without feedback', () => {
    const progress = { 0: true, 1: false }
    const { unmount } = render(() => <Pagination progress={progress}>{pages}</Pagination>)
    expect(page(1)).toHaveClass('bg-green-100')
    expect(page(2)).toHaveClass('bg-red-100')
    expect(page(3)).not.toHaveClass('bg-green-100', 'bg-red-100', 'bg-sky-50')
    unmount()
    render(() => (
      <Pagination progress={progress} showFeedback={false}>
        {pages}
      </Pagination>
    ))
    expect(page(1)).toHaveClass('bg-sky-50')
    expect(page(2)).toHaveClass('bg-sky-50')
    expect(page(1)).not.toHaveClass('bg-green-100')
    expect(page(3)).not.toHaveClass('bg-sky-50')
  })

  describe('an error on one page', () => {
    let consoleError: ReturnType<typeof spyOn>
    beforeEach(() => {
      consoleError = spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => consoleError.mockRestore())

    test('stays on that page', () => {
      const broken = () => {
        throw new Error('Boom')
      }
      render(() => <Pagination>{[pages[0]!, broken]}</Pagination>)
      expect(visible()).toEqual(['Page A'])
      expect(screen.getByText('Erreur')).toBeInTheDocument()
    })
  })
})
