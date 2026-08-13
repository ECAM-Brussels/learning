import { python } from '@learning/repl'
import type { JSX } from '@solidjs/web'
import { createMemo, Loading, Match, Show, Switch } from 'solid-js'
import { Latex } from './Latex'

export default function Python(props: {
  class?: string
  value: string
  math?: boolean
}): JSX.Element {
  const output = createMemo(() => python.run(props.value, { math: props.math ?? false }), {
    ssrSource: 'client',
    loadingValue: { id: '' },
  })
  return (
    <Loading>
      <pre class="not-prose my-2 text-xs">
        <Switch>
          <Match when={output().status === 'loading'}>Chargement de Pyodide...</Match>
          <Match when={output().status === 'importing'}>Import des librairies...</Match>
          <Match when={output().status === 'executing'}>Exécution du code...</Match>
        </Switch>
      </pre>
      <Show when={output().error !== undefined}>
        <Output type="Erreur" class="bg-red-50 text-xs">
          {output().error}
        </Output>
      </Show>
      <Show when={output().stdout !== undefined && output().stdout !== ''}>
        <Output type="stdout">{output().stdout}</Output>
      </Show>
      <Show when={output().result !== '' && output().result !== undefined}>
        <Output type="Résultat">
          <Switch fallback={output().result}>
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
        </Output>
      </Show>
    </Loading>
  )
}

function Output(props: { class?: string; type: string; children: JSX.Element }) {
  return (
    <div class="not-prose flex items-center gap-2">
      <pre class="py-2 text-xs text-slate-700">{props.type}:</pre>
      <pre class={['grow rounded-xs border border-gray-200 p-2 shadow-xs', props.class]}>
        {props.children}
      </pre>
    </div>
  )
}
