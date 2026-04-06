import * as monaco from 'monaco-editor'
import { createEffect, onSettled, type JSX } from 'solid-js'

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
  class?: JSX.ClassList | string
  children: string
  language: string
  onChange?: (value: string) => void
}

export default function Code(props: Props) {
  let container: HTMLDivElement | undefined
  let editor: monaco.editor.IStandaloneCodeEditor | undefined

  createEffect(
    () => props.children,
    (code) => {
      if (editor?.getValue() !== code) {
        editor?.setValue(code)
      }
    },
  )
  createEffect(
    () => props.language,
    (lang) => {
      if (editor) monaco.editor.setModelLanguage(editor.getModel()!, lang)
    },
  )

  onSettled(() => {
    if (container) {
      editor = monaco.editor.create(container, {
        value: props.children,
        language: props.language,
        automaticLayout: true,
        minimap: { enabled: false },
      })
      editor.onDidChangeModelContent(() => {
        props.onChange?.(editor!.getValue())
      })
      editor.updateOptions({ scrollBeyondLastLine: false })
      editor.onDidContentSizeChange(() => {
        const height = editor!.getModel()!.getLineCount() * 19 + 18
        container.style.height = `${height}px`
        editor!.layout()
      })
    }
    return () => editor?.dispose()
  })
  return <div ref={container!} id="container" class={props.class ?? 'shadow'} />
}
