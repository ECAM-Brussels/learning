import Latex from '@learning/components/Latex'
import { mapAsync } from 'es-toolkit'
import { createMemo, Errored } from 'solid-js'

type MaybePromise<T> = T | Promise<T>

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
  ...values: MaybePromise<
    undefined | null | string | number | { latex: () => MaybePromise<string> }
  >[]
) => {
  const latex = createMemo(async () => {
    const parsed = await mapAsync(values, async (v) => {
      const value = await v
      if (!value) return ''
      if (typeof value === 'object') return value.latex()
      return String(value).replace(/e\+?(\d+)/, '\\cdot 10^{ $1 }')
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
