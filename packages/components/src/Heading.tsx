import { Dynamic, type JSX } from '@solidjs/web'
import { debounce } from 'es-toolkit'
import { createEffect, createSignal, onSettled } from 'solid-js'
import { useTableOfContents } from './Page'

export function Heading(props: { children: JSX.Element; level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const [id, setId] = createSignal<string | undefined>()
  const [toc, setToc] = useTableOfContents()!
  const [element, setElement] = createSignal<HTMLElement | null>(null)

  createEffect(
    () => props.children,
    (title) => {
      setToc((t) => {
        if (props.level < 3) {
          setId(String(t.length))
          t.push({ title, level: props.level, visible: false, position: 0 })
        }
      })
    },
  )

  onSettled(() => {
    const observer = new IntersectionObserver(
      debounce((entries) => {
        const entry = entries[0]!
        const index = Number(id())
        if (!Number.isNaN(index))
          setToc((t) => {
            const node = t[index]
            if (!node) return

            const nextVisible = entry.isIntersecting
            const nextPosition = entry.boundingClientRect.top
            if (node.visible === nextVisible && node.position === nextPosition) return

            node.visible = nextVisible
            node.position = nextPosition
          })
      }, 200),
    )
    observer.observe(element()!)
    return () => observer.disconnect()
  })

  return (
    <Dynamic
      component={`h${props.level ?? 1}`}
      ref={setElement}
      class={[
        'print:break-after-avoid',
        { 'text-cyan-900': props.level === 1, 'text-cyan-800': props.level === 2 },
      ]}
      id={id()}
    >
      {props.children}
    </Dynamic>
  )
}
