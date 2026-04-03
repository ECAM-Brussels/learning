import { runPython } from '@learning/repl'
import { createMemo, Loading, Show } from 'solid-js'

export function Python(props: { value: string }) {
  const output = createMemo(() => runPython(props.value))
  return (
    <Loading fallback="Executing code...">
      <Show when={output().result}>
        <pre>{output().result}</pre>
      </Show>
      <Show when={output().stdout}>
        <h6 class="mb-0 [font-variant:small-caps]">Stdout</h6>
        <pre class="mt-0">{output().stdout}</pre>
      </Show>
      <Show when={output().error}>
        <h6 class="mb-0 [font-variant:small-caps]">Error</h6>
        <pre>{output().error}</pre>
      </Show>
    </Loading>
  )
}
