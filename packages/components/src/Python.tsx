import { pyodideStatus, runPython } from '@learning/repl'
import { createMemo, Loading, Show, type JSX } from 'solid-js'
import Latex from './Latex'

export default function Python(props: { value: string; math?: boolean }): JSX.Element {
  const ready = createMemo(pyodideStatus)
  const output = createMemo(() => runPython(props.value, { math: props.math ?? false }))
  const noOutput = createMemo(
    () => `${output().error ?? ''}${output().stdout ?? ''}${output().result ?? ''}`.trim() === '',
  )
  return (
    <Loading fallback={<pre class="my-8 rounded-xl p-4 shadow-sm">Initializing Python...</pre>}>
      {ready() && ''}
      <Show when={!noOutput()}>
        <pre class="my-8 rounded-xl p-4 shadow-sm">
          <Loading fallback="Executing code...">
            <Show
              when={output().format !== 'latex'}
              fallback={<Latex value={output().result ?? ''} />}
            >
              {output().error}
              {output().stdout}
              {output().result}
            </Show>
          </Loading>
        </pre>
      </Show>
    </Loading>
  )
}
