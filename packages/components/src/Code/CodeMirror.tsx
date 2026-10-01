import { python } from '@codemirror/lang-python'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { createEffect, createSignal, onSettled } from 'solid-js'
import type { EditorProps } from './index'

const compartment = new Compartment()

export default function CodeMirror(props: EditorProps) {
  let container: HTMLDivElement | undefined
  let editor: EditorView | undefined
  const [value, setValue] = createSignal(() => props.children)

  createEffect(value, (value) => {
    if (editor?.state.doc.toString() !== value) {
      editor?.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
    } else {
      props.onChange?.(value)
    }
  })

  createEffect(
    () => props.readOnly,
    (readOnly) => {
      editor?.dispatch({
        effects: compartment.reconfigure(EditorState.readOnly.of(readOnly === true)),
      })
    },
  )

  onSettled(() => {
    if (container) {
      const onChange = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setValue(update.state.doc.toString())
        }
      })
      editor = new EditorView({
        state: EditorState.create({
          doc: props.children,
          extensions: [
            basicSetup,
            python(),
            onChange,
            compartment.of(EditorState.readOnly.of(props.readOnly === true)),
          ],
        }),
        parent: container,
      })
    }
    return () => editor?.destroy()
  })

  return <div ref={container!} class={props.class ?? 'my-0 shadow'} />
}
