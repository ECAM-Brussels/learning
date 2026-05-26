import { expr, Expression } from '@learning/core'
import { Dynamic } from '@solidjs/web'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { createMemo, Loading, type JSX } from 'solid-js'
import * as v from 'valibot'

export default function Latex(props: {
  class?: JSX.ClassList | string
  value?: Expression
  displayMode?: boolean
}): JSX.Element {
  const html = createMemo(async () => {
    if (!props.value) return ''
    const latex =
      typeof props.value === 'string'
        ? props.value
        : await expr(v.parse(Expression, props.value)).latex()
    return katex.renderToString(latex, {
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

function makeTex(displayMode: boolean) {
  return (strings: TemplateStringsArray, ...values: (Expression | undefined)[]) => {
    const latex = createMemo(async () => {
      const parsed = await Promise.all(
        values.map(async (value) => {
          if (!value) return ''
          if (typeof value === 'string') return value
          if (typeof value === 'number') return value
          return await expr(v.parse(Expression, value)).latex()
        }),
      )
      return String.raw(strings, ...parsed)
    })

    return <Latex value={latex()} displayMode={displayMode} />
  }
}

/**
 * A helper for rendering LaTeX in JSX using template literals
 *
 * For display mode, use `tex.block`
 *
 * @example {tex`x^2 + y^2 = z^2`} // renders inline
 * @example {tex.block`\int_0^1 x^2 \, \mathrm{d} x = \frac 1 3`} // renders in display mode
 */
export const tex = Object.assign(makeTex(false), {
  /**
   * Render LaTeX via KaTeX in display mode
   */
  block: makeTex(true),
})
