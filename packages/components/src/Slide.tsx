import { Dynamic } from '@solidjs/web'
import { Loading, Show } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'

type Props = {
  class?: JSX.ClassList | string
  children: JSX.Element | (() => JSX.Element)
  title?: JSX.Element
}

export default function Slide(props: Props) {
  return (
    <div class="h-screen w-screen snap-start snap-normal">
      <Show when={props.title}>
        <h3 class="bg-slate-800 p-4 text-2xl font-medium text-slate-50">{props.title}</h3>
      </Show>
      <div class="flex h-full w-full">
        <div class="prose w-full self-center p-4 text-2xl">
          <Loading fallback="Chargement du slide...">
            {typeof props.children === 'function' ? (
              <Dynamic component={props.children} />
            ) : (
              props.children
            )}
          </Loading>
        </div>
      </div>
    </div>
  )
}
