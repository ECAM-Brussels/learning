/** What `tex` accepts between `${` and `}`, kept apart from the component so that it loads without the renderer. */
import { expr } from './expr'

type MaybePromise<T> = T | Promise<T>

type Value =
  | undefined
  | null
  | string
  | number
  | { rawInput: string }
  | { json: Extract<Parameters<typeof expr>[0], { json: any }>['json'] }
  | { latex: () => MaybePromise<string> }

export type Substitution = Value | Promise<Value>

/** The LaTeX of a value interpolated in `tex`; a value may be a promise, such as that of `expr(…).domain()`. */
export async function latexOf(promised: Substitution) {
  const value = await promised
  if (typeof value === 'number' || typeof value === 'string') return value
  if (!value) return ''
  if (typeof value === 'object' && 'rawInput' in value && typeof value.rawInput === 'string')
    return value.rawInput
  // Its own latex first: a set writes its intervals in French, a vector as a column.
  if (typeof value === 'object' && 'latex' in value && typeof value.latex === 'function')
    return value.latex()
  if (typeof value === 'object' && 'json' in value && typeof value.json === 'object')
    return expr({ json: value.json }).latex()
  return String(value).replace(/e\+?(\d+)/, '\\cdot 10^{ $1 }')
}
