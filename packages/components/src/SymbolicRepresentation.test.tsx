import { render, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { createSignal } from 'solid-js'
import Dot from './Dot'
import { SymbolicRepresentation } from './SymbolicRepresentation'

// Sorted: Graphviz writes nodes rank by rank, not in tree order.
const labels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('g.node text'), (t) => t.textContent!).sort()
const edges = (container: HTMLElement) => container.querySelectorAll('g.edge').length

describe('Dot', () => {
  test('renders a graph as SVG and follows its value', async () => {
    const [value, setValue] = createSignal('digraph { a -> b }')
    const { container } = render(() => <Dot value={value()} class="w-full" />)
    await waitFor(() => expect(labels(container)).toEqual(['a', 'b']))
    expect(container.firstElementChild).toHaveClass('w-full')
    setValue('digraph { c }')
    await waitFor(() => expect(labels(container)).toEqual(['c']))
  })

  test('keeps the last graph when the value is invalid', async () => {
    const [value, setValue] = createSignal('digraph { a }')
    const { container } = render(() => <Dot value={value()} />)
    await waitFor(() => expect(labels(container)).toEqual(['a']))
    setValue('digraph {')
    await new Promise((r) => setTimeout(r, 20))
    expect(labels(container)).toEqual(['a'])
  })
})

describe('SymbolicRepresentation', () => {
  test('draws the tree of a LaTeX expression as written', async () => {
    const { container } = render(() => <SymbolicRepresentation expr="x^2+1" />)
    await waitFor(() => expect(labels(container)).toEqual(['1', '2', 'Add', 'Power', 'x']))
    expect(edges(container)).toBe(4)
  })

  test('draws the tree of a MathJSON expression', async () => {
    const { container } = render(() => (
      <SymbolicRepresentation expr={['Multiply', 2, ['Sin', 'x']]} />
    ))
    await waitFor(() => expect(labels(container)).toEqual(['2', 'Multiply', 'Sin', 'x']))
    expect(edges(container)).toBe(3)
  })

  test('draws a lone symbol as a single node', async () => {
    const { container } = render(() => <SymbolicRepresentation expr="x" />)
    await waitFor(() => expect(labels(container)).toEqual(['x']))
    expect(edges(container)).toBe(0)
  })
})
