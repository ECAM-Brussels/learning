import { Latex } from '@learning/components'
import { mapAsync } from 'es-toolkit'
import { createMemo, Errored, Loading } from 'solid-js'
import { expr } from './expr'

type MaybePromise<T> = T | Promise<T>

type Substitution =
  | undefined
  | null
  | string
  | number
  | { rawInput: string }
  | { json: Extract<Parameters<typeof expr>[0], { json: any }>['json'] }
  | { latex: () => MaybePromise<string> }

function Tex(props: {
  strings: TemplateStringsArray
  values: Substitution[]
  displayMode?: boolean
}) {
  const parsed = createMemo(() => {
    return mapAsync(props.values, async (value) => {
      if (typeof value === 'number' || typeof value === 'string') return value
      if (!value) return ''
      if (typeof value === 'object' && 'rawInput' in value && typeof value.rawInput === 'string')
        return value.rawInput
      if (typeof value === 'object' && 'json' in value && typeof value.json === 'object')
        return expr({ json: value.json }).latex()
      if (typeof value === 'object' && 'latex' in value && typeof value.latex === 'function')
        return value.latex()
      return String(value).replace(/e\+?(\d+)/, '\\cdot 10^{ $1 }')
    })
  })
  const latex = createMemo(() => {
    return String.raw(props.strings, ...parsed())
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
      <Loading>
        <Latex value={latex()} displayMode={displayMode() || props.displayMode} />
      </Loading>
    </Errored>
  )
}

/**
 * Displays LaTeX, written as a template: `` {tex`\frac{a}{b}`} ``.
 * Between `${` and `}`, a value is inserted:
 * a number or text as it is,
 * and an expression of `expr` as its LaTeX, computed if needed,
 * so that a solution is written nowhere but computed.
 * The formula is inline, or displayed on its own line when the template has several lines;
 * `tex.display` and `tex.inline` choose explicitly.
 * In MDX, write LaTeX that contains braces with `tex` rather than `$…$`,
 * which the MDX language server reads as expressions.
 *
 * @example
 * {tex`x^2 + y^2 = z^2`}
 * {tex`f'(x) = ${expr('x^3').diff()}`} // f'(x) = 3x^2
 * {tex.display`\int_0^1 x^2 \, \mathrm{d}x = ${expr('x^2').integrate('x', 0, 1)}`}
 * // In a prompt, with the step's data:
 * <p>Calculez la dérivée de {tex`f(x) = ${ctx.data.f}`}.</p>
 */
export const tex = Object.assign(
  (strings: TemplateStringsArray, ...values: Substitution[]) => {
    return <Tex strings={strings} values={values} />
  },
  {
    /** The formula on its own line, centred: `` {tex.display`\sum_{k=1}^n k`} ``. */
    display: (strings: TemplateStringsArray, ...values: Substitution[]) => {
      return <Tex strings={strings} values={values} displayMode />
    },
    /** The formula within the text, even written on several lines. */
    inline: (strings: TemplateStringsArray, ...values: Substitution[]) => {
      return <Tex strings={strings} values={values} displayMode={false} />
    },
    /** The LaTeX as text, backslashes kept, to build it before displaying it. */
    raw: String.raw,
  },
)
