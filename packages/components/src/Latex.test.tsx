import { render } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { createSignal, flush } from 'solid-js'
import { Latex } from './Latex'
import { Markdown } from './Markdown'

describe('Latex', () => {
  test('renders inline math in a span', () => {
    const { container } = render(() => <Latex value="\frac{1}{2}" class="text-lg" />)
    const span = container.firstElementChild!
    expect(span.tagName).toBe('SPAN')
    expect(span).toHaveClass('text-lg')
    expect(span.querySelector('.katex .mfrac')).not.toBeNull()
    expect(span.querySelector('.katex-display')).toBeNull()
  })

  test('renders display math in a div', () => {
    const { container } = render(() => <Latex value="x^2" displayMode />)
    expect(container.firstElementChild!.tagName).toBe('DIV')
    expect(container.querySelector('.katex-display')).not.toBeNull()
  })

  test('renders nothing without a value', () => {
    const { container } = render(() => <Latex />)
    expect(container.firstElementChild).toBeEmptyDOMElement()
  })

  test("understands Compute Engine's macros", () => {
    const { container } = render(() => <Latex value="\exponentialE^{\imaginaryI x}+\placeholder" />)
    expect(container.querySelector('.katex-error')).toBeNull()
    expect(container.querySelector('.katex-html')).toHaveTextContent(/^eix\+$/)
  })

  test('shows invalid LaTeX as its source, in red, instead of throwing', () => {
    const { container } = render(() => <Latex value="\frac{1}" />)
    expect(container.querySelector('.katex-error')).toHaveTextContent('\\frac{1}')
    expect(container.querySelector('.katex-error')).toHaveAttribute(
      'title',
      expect.stringContaining('KaTeX parse error'),
    )
  })

  test('follows its value', () => {
    const [value, setValue] = createSignal('a')
    const { container } = render(() => <Latex value={value()} />)
    setValue('b')
    flush()
    expect(container.querySelector('.katex-html')).toHaveTextContent('b')
  })
})

describe('Markdown', () => {
  test('renders Markdown as prose by default', () => {
    const { container } = render(() => <Markdown value={'**gras** et *italique*'} />)
    const span = container.firstElementChild!
    expect(span).toHaveClass('prose')
    expect(span.querySelector('strong')).toHaveTextContent('gras')
    expect(span.querySelector('em')).toHaveTextContent('italique')
  })

  test('renders math with KaTeX', () => {
    const { container } = render(() => <Markdown value="$x^2$ et $$y$$" />)
    expect(container.querySelectorAll('.katex')).toHaveLength(2)
  })

  test('takes a class and renders nothing without a value', () => {
    const { container } = render(() => <Markdown class="text-sm" />)
    expect(container.firstElementChild).toHaveClass('text-sm')
    expect(container.firstElementChild).not.toHaveClass('prose')
    expect(container.firstElementChild).toBeEmptyDOMElement()
  })

  test('escapes HTML', () => {
    const { container } = render(() => <Markdown value="<script>alert(1)</script>" />)
    expect(container.querySelector('script')).toBeNull()
  })
})
