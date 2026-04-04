import { pyodideStatus, runPython } from '@learning/repl'
import { createMemo, Errored, Loading, Show } from 'solid-js'
import { Latex } from './Latex'

export function Python(props: { value: string; math?: boolean }) {
  const ready = createMemo(pyodideStatus)
  const result = createMemo(() => runPython(props.value, { math: props.math ?? false }))
  const output = createMemo(() => {
    const { format, ...rest } = result()
    return Object.values(rest).join('\n')
  })
  return (
    <pre class="my-8 rounded-xl bg-slate-200 p-4 shadow-sm">
      <Loading fallback="Initializing Python...">
        {ready() && ''}
        <Loading fallback="Executing code...">
          <Errored fallback="An error occurred while executing the code.">
            <Show when={result().format === 'latex'} fallback={output()}>
              <Latex value={output()} />
            </Show>
          </Errored>
        </Loading>
      </Loading>
    </pre>
  )
}
