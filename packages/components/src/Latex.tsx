import { dynamic, type JSX } from '@solidjs/web'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { createMemo, Loading } from 'solid-js'

export function Latex(props: {
  class?: JSX.ClassValue | string
  value?: string
  displayMode?: boolean
}): JSX.Element {
  const html = createMemo(() => {
    if (!props.value) return ''
    return katex.renderToString(props.value, {
      displayMode: props.displayMode,
      strict: false,
      output: 'html',
      macros: {
        '\\placeholder': '',
        '\\exponentialE': 'e',
        '\\imaginaryI': 'i',
      },
    })
  })
  const Tag = dynamic(() => (props.displayMode ? 'div' : 'span'))
  return (
    <Loading>
      <Tag class={props.class} innerHTML={html()} />
    </Loading>
  )
}
