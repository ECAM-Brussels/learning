import { render, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { createSignal } from 'solid-js'
import { Highlight, hl } from './Highlight'
import HighlightImplementation from './HighlightImplementation'

const pre = (container: HTMLElement) => container.querySelector('pre[aria-busy]')!
const highlighted = (container: HTMLElement) =>
  waitFor(() => expect(container.querySelector('pre[aria-busy] .shiki')).not.toBeNull())

describe('Highlight', () => {
  test('highlights code with shiki', async () => {
    const { container } = render(() => <HighlightImplementation code="x = 1" lang="python" />)
    await highlighted(container)
    expect(pre(container)).toHaveTextContent('x = 1')
    expect(pre(container).querySelector('.shiki')).toHaveClass('github-light')
    expect(pre(container).querySelectorAll('span[style]').length).toBeGreaterThan(1)
    expect(pre(container)).toHaveAttribute('aria-busy', 'false')
  })

  test('takes a class and a theme', async () => {
    const { container } = render(() => (
      <HighlightImplementation code="a" lang="python" theme="github-dark" class="text-xs" />
    ))
    await highlighted(container)
    expect(pre(container)).toHaveClass('text-xs')
    expect(pre(container).querySelector('.shiki')).toHaveClass('github-dark')
  })

  test('keeps the old code, dimmed, while new code is highlighted', async () => {
    const [code, setCode] = createSignal('a = 1')
    const { container } = render(() => <HighlightImplementation code={code()} lang="python" />)
    await highlighted(container)
    setCode('b = 2')
    await waitFor(() => expect(pre(container)).toHaveTextContent('b = 2'))
    expect(pre(container)).toHaveAttribute('aria-busy', 'false')
    expect(pre(container)).not.toHaveClass('opacity-50')
  })

  test('loads lazily on the client', async () => {
    const { container } = render(() => <Highlight code="print(1)" lang="python" />)
    await highlighted(container)
    expect(pre(container)).toHaveTextContent('print(1)')
  })

  test('the hl template dedents its code', async () => {
    const { container } = render(
      () => hl('python')`
      def f():
          return ${1 + 1}
    `,
    )
    await highlighted(container)
    expect(pre(container).textContent).toBe('def f():\n    return 2')
  })
})
