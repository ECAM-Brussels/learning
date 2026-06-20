import type { JSX } from '@solidjs/web'
import * as monaco from 'monaco-editor'
import { createEffect, createSignal, onSettled, Show } from 'solid-js'
import { Python } from './Python'

self.MonacoEnvironment = {
  getWorker: async function (workerId, label) {
    let worker

    switch (label) {
      case 'json':
        worker = await import('monaco-editor/esm/vs/language/json/json.worker?worker' as any)
        break
      case 'css':
      case 'scss':
      case 'less':
        worker = await import('monaco-editor/esm/vs/language/css/css.worker?worker' as any)
        break
      case 'html':
      case 'handlebars':
      case 'razor':
        worker = await import('monaco-editor/esm/vs/language/html/html.worker?worker' as any)
        break
      case 'typescript':
      case 'javascript':
        worker = await import('monaco-editor/esm/vs/language/typescript/ts.worker?worker' as any)
        break
      default:
        worker = await import('monaco-editor/esm/vs/editor/editor.worker?worker' as any)
    }

    return new worker.default()
  },
}

type Props = {
  class?: JSX.ClassValue | string
  children: string
  onChange?: (value: string) => void
} & {
  lang: 'python'
  run?: boolean
  math?: boolean
}

/**
 * Display the Monaco editor (used in VSCode)
 *
 * For Python (`lang="python"`), the following props are available:
 * - `run`: whether to execute the code and display the output (default: `false`)
 * - `math`: whether to render Sympy math outputs using KaTeX (default: `false`)
 */
export default function Code(props: Props) {
  let container: HTMLDivElement | undefined
  let editor: monaco.editor.IStandaloneCodeEditor | undefined
  const [value, setValue] = createSignal(() => props.children)

  createEffect(value, (value) => {
    if (editor?.getValue() !== value) {
      editor?.setValue(value)
    } else {
      props.onChange?.(value)
    }
  })
  createEffect(
    () => props.lang,
    (lang) => {
      if (editor) monaco.editor.setModelLanguage(editor.getModel()!, lang)
    },
  )

  onSettled(() => {
    if (container) {
      editor = monaco.editor.create(container, {
        value: props.children,
        language: props.lang,
        automaticLayout: true,
        minimap: { enabled: false },
      })
      editor.onDidChangeModelContent(() => setValue(editor!.getValue()))
      editor.updateOptions({ scrollBeyondLastLine: false })
      editor.onDidContentSizeChange(() => {
        const height = editor!.getModel()!.getLineCount() * 19 + 18
        container.style.height = `${height}px`
        editor!.layout()
      })
    }
    return () => editor?.dispose()
  })
  return (
    <>
      <div ref={container!} id="container" class={props.class ?? 'shadow'} />
      <Show when={props.lang === 'python' && props.run}>
        <Python value={value()} math={props.math} />
      </Show>
    </>
  )
}
