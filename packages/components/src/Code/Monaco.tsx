import * as monaco from 'monaco-editor'
import { createEffect, createSignal, onSettled } from 'solid-js'
import type { EditorProps } from './index'

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

/**
 * Display the Monaco editor (used in VSCode)
 *
 * For Python (`lang="python"`), the following props are available:
 * - `run`: whether to execute the code and display the output (default: `false`)
 * - `math`: whether to render Sympy math outputs using KaTeX (default: `false`)
 */
export default function Code(props: EditorProps) {
  let container: HTMLDivElement | undefined
  let editor: monaco.editor.IStandaloneCodeEditor | undefined
  const [value, setValue] = createSignal(() => props.children ?? '')

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

  function mount() {
    if (editor || !container) return
    editor = monaco.editor.create(container, {
      value: value(),
      language: props.lang,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollbar: {
        alwaysConsumeMouseWheel: false,
      },
    })
    editor.onDidChangeModelContent(() => setValue(editor!.getValue()))
    editor.updateOptions({ scrollBeyondLastLine: false })
    editor.onDidContentSizeChange(() => {
      const height = editor!.getModel()!.getLineCount() * 19 + 18
      container.style.height = `${height}px`
      editor!.layout()
    })
  }

  function unmount() {
    editor?.dispose()
    editor = undefined
  }

  onSettled(() => {
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) mount()
        else unmount()
      },
      { rootMargin: '200px' },
    )
    observer.observe(container)
    return () => {
      observer.disconnect()
      unmount()
    }
  })
  return <div ref={container!} id="container" class={props.class ?? 'my-0 shadow'} />
}
