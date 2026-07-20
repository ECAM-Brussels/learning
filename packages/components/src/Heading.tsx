import { Dynamic, type JSX } from '@solidjs/web'
import { debounce } from 'es-toolkit'
import { createEffect, createSignal, onSettled } from 'solid-js'
import { setToc } from './Page'

export function Heading(props: { children: JSX.Element; level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const [id, setId] = createSignal<string | undefined>()
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
        if (id())
          setToc((t) => {
            t[Number(id())]!.visible = entry.isIntersecting
            t[Number(id())]!.position = entry.boundingClientRect.top
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
