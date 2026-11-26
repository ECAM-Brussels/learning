import { EditorView } from '@codemirror/view'
import { render, waitFor } from '@solidjs/testing-library'
import { describe, expect, mock, test } from 'bun:test'
import { createSignal, flush } from 'solid-js'
import { Code } from './Code'

const editor = async () => {
  await waitFor(() => expect(document.querySelector('.cm-editor')).not.toBeNull())
  return EditorView.findFromDOM(document.querySelector('.cm-editor') as HTMLElement)!
}
const type = (view: EditorView, text: string) =>
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })

describe('Code with CodeMirror', () => {
  test('shows the code and reports edits', async () => {
    const onChange = mock()
    render(() => (
      <Code lang="python" backend="codemirror" onChange={onChange}>
        x = 1
      </Code>
    ))
    const view = await editor()
    expect(view.state.doc.toString()).toBe('x = 1')
    type(view, 'x = 2')
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('x = 2'))
  })

  test('follows readOnly', async () => {
    const [readOnly, setReadOnly] = createSignal(false)
    render(() => (
      <Code lang="python" backend="codemirror" readOnly={readOnly()}>
        x = 1
      </Code>
    ))
    const view = await editor()
    expect(view.state.readOnly).toBe(false)
    setReadOnly(true)
    flush()
    expect(view.state.readOnly).toBe(true)
  })

  test('is destroyed on unmount', async () => {
    const { unmount } = render(() => (
      <Code lang="python" backend="codemirror">
        x = 1
      </Code>
    ))
    const view = await editor()
    const destroy = mock(view.destroy.bind(view))
    view.destroy = destroy
    unmount()
    expect(destroy).toHaveBeenCalled()
  })
})
