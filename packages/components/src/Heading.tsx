import { Dynamic } from '@solidjs/web'
import { createEffect, createSignal, type JSX } from 'solid-js'
import { useTableOfContents } from './Page'

export function Heading(props: { children: JSX.Element; level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const [id, setId] = createSignal<string | undefined>()
  const toc = useTableOfContents()
  createEffect(
    () => props.children,
    (title) => {
      toc?.[1]((t) => {
        if (props.level < 3) {
          setId(String(t.length))
          t.push({ title, level: props.level })
        }
      })
    },
  )
  return (
    <Dynamic
      component={`h${props.level ?? 1}`}
      class={{ 'text-cyan-900': props.level === 1, 'text-cyan-800': props.level === 2 }}
      id={id()}
    >
      {props.children}
    </Dynamic>
  )
}
