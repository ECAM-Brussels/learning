import { Loading, Show } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'

type Props = {
  class?: string
  children: JSX.Element
  title?: JSX.Element
}

/**
 * Display a slide with an optional title
 *
 * `<Slide>` components should be used inside a `<Slideshow>`.
 *
 * @example
 * <Slide title="Hello">
 *   <p>Hello world!</p>
 * </Slide>
 */
export function Slide(props: Props) {
  return (
    <div class="h-full w-full snap-start overflow-hidden">
      <Show when={props.title}>
        <h3 class="m-0 bg-slate-800 p-4 text-2xl font-medium text-slate-50">{props.title}</h3>
      </Show>
      <div class="prose prose-li:leading-normal prose-p:leading-loose flex h-full w-full max-w-none text-2xl">
        <div class={['self-center', props.class]}>
          <Loading fallback="Chargement du slide...">{props.children}</Loading>
        </div>
      </div>
    </div>
  )
}
