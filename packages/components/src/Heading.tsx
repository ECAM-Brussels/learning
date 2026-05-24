import { Dynamic } from '@solidjs/web'
import { createEffect, type JSX } from 'solid-js'
import { useTableOfContents } from './Page'

export function Heading(props: { children: JSX.Element; level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const toc = useTableOfContents()
  createEffect(
    () => String(props.children),
    (title) => {
      toc?.[1]((t) => {
        if (props.level < 3) t.push({ title, level: props.level })
      })
    },
  )
  return (
    <Dynamic
      component={`h${props.level ?? 1}`}
      class={{ 'text-cyan-900': props.level === 1, 'text-cyan-800': props.level === 2 }}
    >
      {props.children}
    </Dynamic>
  )
}
