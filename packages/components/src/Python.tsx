import { pyodideStatus, runPython } from '@learning/repl'
import { createMemo, Loading } from 'solid-js'

export function Python(props: { value: string }) {
  const ready = createMemo(pyodideStatus)
  const output = createMemo(() => runPython(props.value))
  return (
    <pre>
      <Loading fallback="Initializing Python...">
        {ready()}
        <Loading fallback="Executing code...">
          {output().result}
          {output().stdout}
          {output().error}
        </Loading>
      </Loading>
    </pre>
  )
}
