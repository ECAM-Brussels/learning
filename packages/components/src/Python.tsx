import { runPython } from '@learning/repl'
import { createMemo, Loading, Match, Show, Switch, type JSX } from 'solid-js'
import { Latex } from './Latex'

export function Python(props: { class?: string; value: string; math?: boolean }): JSX.Element {
  const output = createMemo(() => runPython(props.value, { math: props.math ?? false }))
  const empty = createMemo(
    () => `${output().error ?? ''}${output().stdout ?? ''}${output().result ?? ''}`.trim() === '',
  )
  return (
    <Loading>
      <pre class="not-prose my-2 text-xs">
        <Switch>
          <Match when={output().status === 'loading'}>Chargement de Pyodide...</Match>
          <Match when={output().status === 'importing'}>Import des librairies...</Match>
          <Match when={output().status === 'executing'}>Exécution du code...</Match>
        </Switch>
      </pre>
      <Show when={!empty()}>
        <pre
          class={[
            'not-prose my-8',
            { 'bg-red-50 text-xs': output().error !== undefined },
            props.class ?? 'rounded-xl p-4 shadow-sm',
          ]}
        >
          <Switch
            fallback={
              <>
                {output().error}
                {output().stdout}
                {output().result}
              </>
            }
          >
            <Match when={output().format == 'latex'}>
              <Latex value={output().result ?? ''} />
            </Match>
            <Match when={output().format == 'image'}>
              <img
                class="mx-auto my-0"
                src={output().result}
                alt="Résultat de l'exécution du code"
              />
            </Match>
          </Switch>
        </pre>
      </Show>
    </Loading>
  )
}
