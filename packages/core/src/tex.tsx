import Latex from '@learning/components/Latex'
import { mapAsync } from 'es-toolkit'
import { createMemo, Errored } from 'solid-js'
import * as v from 'valibot'
import { Expression, type Quantity } from './expr'

/**
 * A helper for rendering LaTeX in JSX using template literals
 *
 * For display mode, make sure the string contains more than one line.
 *
 * @example {tex`x^2 + y^2 = z^2`} // renders inline
 * @example
 * {tex`
 *   \int_0^1 x^2 \, \mathrm{d} x = \frac 1 3
 * `} // renders in display mode
 */
export const tex = (
  strings: TemplateStringsArray,
  ...values: (Expression | undefined | Quantity)[]
) => {
  const latex = createMemo(async () => {
    const parsed = await mapAsync(values, async (value) => {
      if (!value) return ''
      if (typeof value === 'string') return value
      if (typeof value === 'number') return String(value).replace(/e\+?(\d+)/, '\\cdot 10^{ $1 }')
      if (typeof value === 'object' && 'latex' in value && typeof value.latex === 'function')
        return await value.latex()
      return await v.parse(Expression, value).latex()
    })
    return String.raw(strings, ...parsed)
  })
  const displayMode = createMemo(() => latex().split('\n').length > 1)
  return (
    <Errored fallback={(error) => <pre>Erreur: {String(error)}</pre>}>
      <Latex value={latex()} displayMode={displayMode()} />
    </Errored>
  )
}
