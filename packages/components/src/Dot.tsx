import { instance } from '@viz-js/viz'
import { createEffect, createMemo } from 'solid-js'

export default function Dot(props: { class?: string; value: string }) {
  let container: HTMLDivElement

  const viz = createMemo(() => instance(), { ssrSource: 'client' })

  createEffect(
    () => [viz(), props.value] as const,
    ([viz, value]) => {
      try {
        const svg = viz.renderSVGElement(value)
        if (svg) {
          container!.replaceChildren(svg)
        }
      } catch {}
    },
  )

  return <div ref={container!} class={props.class} />
}
