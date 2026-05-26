import Latex from '@learning/components/Latex'
import { createMemo } from 'solid-js'
import * as v from 'valibot'
import { expr, Expression } from './expr'

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
