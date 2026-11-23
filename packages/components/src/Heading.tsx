import { dynamic, type JSX } from '@solidjs/web'
import { createMemo, onSettled, useContext } from 'solid-js'
import { TOCContext } from './Page'

export function Heading(props: { children: JSX.Element; level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const toc = useContext(TOCContext)
  let element!: HTMLHeadingElement
  const index = createMemo(
    () => toc?.entries().findIndex((entry) => entry.element === element) ?? -1,
  )

  onSettled(() => toc?.register({ title: () => props.children, level: props.level, element }))

  const HeadingTag = dynamic(() => `h${props.level ?? 1}`)

  return (
    <HeadingTag
      ref={element}
      class={[
        'print:break-after-avoid',
        {
          'text-cyan-900': props.level === 1,
          'text-cyan-800': props.level === 2,
          'text-cyan-700': props.level === 3,
        },
      ]}
      id={index() === -1 ? undefined : String(index())}
    >
      {props.children}
    </HeadingTag>
  )
}
