import { pyodideStatus, runPython } from '@learning/repl'
import { createMemo, isPending, Loading, Match, Show, Switch, type JSX } from 'solid-js'
import { Latex } from './Latex'

export function Python(props: { class?: string; value: string; math?: boolean }): JSX.Element {
  const status = createMemo(pyodideStatus)
  const output = createMemo(() => runPython(props.value, { math: props.math ?? false }))
  const noOutput = createMemo(
    () => `${output().error ?? ''}${output().stdout ?? ''}${output().result ?? ''}`.trim() === '',
  )
  return (
    <Loading>
      <pre class="not-prose my-2 text-xs">
        <Switch>
          <Match when={status() === 'loading'}>Chargement de Pyodide...</Match>
          <Match when={status() === 'importing'}>Import des librairies...</Match>
          <Match when={status() === 'executing'}>Exécution du code...</Match>
          <Match when={isPending(output)}>Calcul en cours...</Match>
        </Switch>
      </pre>
      <Loading>
        <Show when={!noOutput()}>
          <pre
            class={[
              'not-prose my-8',
              { 'bg-red-50': output().error !== undefined },
              props.class ?? 'rounded-xl p-4 shadow-sm',
            ]}
          >
            <Show
              when={output().format !== 'latex'}
              fallback={<Latex value={output().result ?? ''} />}
            >
              {output().error}
              {output().stdout}
              {output().result}
            </Show>
          </pre>
        </Show>
      </Loading>
    </Loading>
  )
}
