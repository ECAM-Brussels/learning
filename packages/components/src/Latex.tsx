import { Dynamic } from '@solidjs/web'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { createMemo, Loading, type JSX } from 'solid-js'

export default function Latex(props: {
  class?: JSX.ClassList | string
  value?: string
  displayMode?: boolean
}): JSX.Element {
  const html = createMemo(async () => {
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
  return (
    <Loading>
      <Dynamic
        component={props.displayMode ? 'div' : 'span'}
        class={props.class}
        innerHTML={html()}
      />
    </Loading>
  )
}
