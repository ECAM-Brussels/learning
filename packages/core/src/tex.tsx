import { Latex } from '@learning/components'
import { mapAsync } from 'es-toolkit'
import { createMemo, Errored } from 'solid-js'
import { expr } from './expr'

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
export const tex = Object.assign(
  (
    strings: TemplateStringsArray,
    ...values: MaybePromise<
      | undefined
      | null
      | string
      | number
      | { rawInput: string }
      | { json: Extract<Parameters<typeof expr>[0], { json: any }>['json'] }
      | { latex: () => MaybePromise<string> }
    >[]
  ) => {
    const latex = createMemo(async () => {
      const parsed = await mapAsync(values, async (v) => {
        const value = await v
        if (!value) return ''
        if (typeof value === 'object' && 'rawInput' in value && typeof value.rawInput === 'string')
          return value.rawInput
        if (typeof value === 'object' && 'json' in value && typeof value.json === 'object')
          return expr({ json: value.json }).latex()
        if (typeof value === 'object' && 'latex' in value && typeof value.latex === 'function')
          return value.latex()
        return String(value).replace(/e\+?(\d+)/, '\\cdot 10^{ $1 }')
      })
      return String.raw(strings, ...parsed)
    })
    const displayMode = createMemo(() => latex().split('\n').length > 1)
    return (
      <Errored
        fallback={
          <span class="border border-red-900 px-1 text-red-900">
            Erreur lors de l'affichage de la formule
          </span>
        }
      >
        <Latex value={latex()} displayMode={displayMode()} />
      </Errored>
    )
  },
  {
    raw: String.raw,
  },
)
