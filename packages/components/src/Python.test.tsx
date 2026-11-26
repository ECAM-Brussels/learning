import { render, screen, waitFor } from '@solidjs/testing-library'
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { repl } from './fakeRepl'

const { default: Python } = await import('./Python')

beforeEach(() => repl.reset())

describe('Python', () => {
  test('shows progress, then the result and what was printed', async () => {
    repl.outputs['print(1)\n2'] = { stdout: '1', result: '2', format: 'text' }
    render(() => <Python value={'print(1)\n2'} />)
    await waitFor(() => expect(screen.getByText('Chargement de Pyodide...')).toBeInTheDocument())
    repl.release()
    await waitFor(() => expect(screen.getByText('Résultat:')).toBeInTheDocument())
    expect(screen.queryByText('Chargement de Pyodide...')).toBeNull()
    expect(screen.getByText('stdout:').nextElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Résultat:').nextElementSibling).toHaveTextContent('2')
    expect(screen.queryByText('Erreur:')).toBeNull()
  })

  test('shows errors', async () => {
    repl.outputs['1/0'] = { error: 'ZeroDivisionError' }
    render(() => <Python value="1/0" />)
    repl.release()
    await waitFor(() => expect(screen.getByText('Erreur:')).toBeInTheDocument())
    expect(screen.getByText('ZeroDivisionError')).toHaveClass('bg-red-50')
    expect(screen.queryByText('Résultat:')).toBeNull()
    expect(screen.queryByText('stdout:')).toBeNull()
  })

  test('renders LaTeX results with KaTeX', async () => {
    repl.outputs['x'] = { result: 'x^2', format: 'latex' }
    const { container } = render(() => <Python value="x" math />)
    repl.release()
    await waitFor(() => expect(container.querySelector('.katex')).not.toBeNull())
    expect(repl.runs).toEqual([{ code: 'x', options: { math: true } }])
  })

  test('renders image results', async () => {
    repl.outputs['plot'] = { result: 'data:image/png;base64,AAAA', format: 'image' }
    render(() => <Python value="plot" />)
    repl.release()
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,AAAA'),
    )
  })

  test('runs without math by default and reports each output', async () => {
    const onChange = mock()
    render(() => <Python value="pass" onChange={onChange} />)
    repl.release()
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ status: 'done', result: '' }))
    expect(onChange.mock.calls[0]![0]).toEqual({ status: 'loading' })
    expect(repl.runs).toEqual([{ code: 'pass', options: { math: false } }])
  })
})
