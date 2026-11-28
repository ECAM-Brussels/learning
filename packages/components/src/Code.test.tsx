import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createSignal, flush } from 'solid-js'
import { repl } from './fakeRepl'

// Monaco needs a real browser: stand in with a textarea that passes on what it is given.
// CodeMirror runs in happy-dom but has its own file (CodeMirror.test.tsx):
// once it has been mounted, later DOM updates in the same file take seconds.
mock.module('./Code/Monaco', () => ({
  default: (props: { children: string; readOnly?: boolean; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="editor"
      value={props.children}
      readonly={props.readOnly}
      onInput={(e) => props.onChange?.(e.currentTarget.value)}
    />
  ),
}))

const { Code, code } = await import('./Code')
const { Form } = await import('./Form')

beforeEach(() => repl.reset())

const editor = () => waitFor(() => screen.getByTestId('editor') as HTMLTextAreaElement)
const type = async (text: string) => fireEvent.input(await editor(), { target: { value: text } })
const runButton = () => screen.getByRole('button', { name: '▶' })

describe('Code', () => {
  test('shows the code and reports edits', async () => {
    const onChange = mock()
    render(() => (
      <Code lang="python" onChange={onChange}>
        x = 1
      </Code>
    ))
    expect(await editor()).toHaveValue('x = 1')
    await type('x = 2')
    expect(onChange).toHaveBeenCalledWith('x = 2')
  })

  test('does not run the code unless asked', async () => {
    render(() => <Code lang="python">x = 1</Code>)
    await editor()
    expect(repl.runs).toEqual([])
    expect(screen.queryByRole('button', { name: '▶' })).toBeNull()
  })

  test('runs the code as it changes in automatic mode', async () => {
    repl.outputs['1 + 1'] = { result: '2' }
    render(() => (
      <Code lang="python" run>
        1 + 1
      </Code>
    ))
    await editor()
    repl.release()
    await waitFor(() => expect(screen.getByText('Résultat:')).toBeInTheDocument())
    expect(screen.getByText('2')).toBeInTheDocument()
    await type('2 + 2')
    await waitFor(() => expect(repl.runs.map((r) => r.code)).toEqual(['1 + 1', '2 + 2']))
  })

  test('in manual mode, runs the given code first and the editor only on ▶', async () => {
    render(() => (
      <Code lang="python" run="print('prêt')" mode="manual" math>
        1 + 1
      </Code>
    ))
    await waitFor(() =>
      expect(repl.runs).toEqual([{ code: "print('prêt')", options: { math: true } }]),
    )
    await type('3 + 3')
    await new Promise((r) => setTimeout(r, 10))
    expect(repl.runs).toHaveLength(1)
    const run = runButton()
    repl.release()
    await waitFor(() => expect(run).toBeEnabled())
    fireEvent.click(run)
    await waitFor(() => expect(repl.runs.map((r) => r.code)).toEqual(["print('prêt')", '3 + 3']))
  })

  test('asks for the lines input() reads when the code calls it, and runs with them', async () => {
    render(() => (
      <Code lang="python" run>
        x = 1
      </Code>
    ))
    await editor()
    expect(screen.queryByLabelText('Entrées du programme, une par ligne')).toBeNull()
    await type('name = input()\nprint(name)')
    const box = (await screen.findByLabelText(
      'Entrées du programme, une par ligne',
    )) as HTMLTextAreaElement
    fireEvent.input(box, { target: { value: 'Alice\nBob\n' } })
    await waitFor(() =>
      expect(repl.runs.at(-1)).toEqual({
        code: 'name = input()\nprint(name)',
        options: { math: false, stdin: ['Alice', 'Bob'] },
      }),
    )
  })

  test('▶ is disabled while the code runs', async () => {
    render(() => (
      <Code lang="python" run="x" mode="manual">
        x
      </Code>
    ))
    const run = await waitFor(runButton)
    await waitFor(() => expect(run).toBeDisabled())
    repl.release()
    await waitFor(() => expect(run).toBeEnabled())
  })

  test('is read-only in a read-only form, unless told otherwise', async () => {
    const [readOnly, setReadOnly] = createSignal(true)
    render(() => (
      <Form readOnly={readOnly()}>
        <Code lang="python">x = 1</Code>
        <Code lang="python" readOnly={false}>
          y = 1
        </Code>
      </Form>
    ))
    await waitFor(() => expect(screen.getAllByTestId('editor')).toHaveLength(2))
    const [inForm, overridden] = screen.getAllByTestId('editor')
    expect(inForm).toHaveAttribute('readonly')
    expect(overridden).not.toHaveAttribute('readonly')
    setReadOnly(false)
    flush()
    expect(inForm).not.toHaveAttribute('readonly')
  })

  test('the code template dedents its code and passes its props', async () => {
    render(
      () =>
        code({ lang: 'python', readOnly: true })`
        def f():
            return ${1 + 1}
      `,
    )
    expect(await editor()).toHaveValue('def f():\n    return 2')
    expect(await editor()).toHaveAttribute('readonly')
  })
})
