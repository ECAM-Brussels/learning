import { dynamic, type JSX } from '@solidjs/web'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { createMemo, Loading } from 'solid-js'

/**
 * LaTeX given as text, displayed with KaTeX.
 * In pages and prompts, `tex` is simpler, and inserts expressions of `expr`.
 *
 * @example
 * <Latex value="\\frac{a}{b}" displayMode />
 */
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
      throwOnError: false,
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
