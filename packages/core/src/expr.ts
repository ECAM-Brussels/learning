import {
  type ExpressionInput as CEExpressionInput,
  ComputeEngine,
  N,
} from '@cortex-js/compute-engine'
import stringify from 'safe-stable-stringify'
import * as v from 'valibot'
import { encrypt } from './crypto'
import symapi from './symapi'

const ce = new ComputeEngine()

const integrateParams = v.union([
  v.pipe(
    v.strictTuple([]),
    v.transform(() => ['x']),
  ),
  v.strictTuple([v.string()]),
  v.pipe(
    v.strictTuple([v.string(), v.number(), v.number()]),
    v.transform(([x, a, b]) => [['Tuple', x, a, b]] as const),
  ),
])

function sanitize<T extends CEExpressionInput>(json: T): T {
  if (json === 'CatalanConstant') return 'G' as T
  if (typeof json === 'number' || typeof json === 'string') return json
  if (Array.isArray(json)) return json.map(sanitize) as unknown as T
  return json
}

const Math: v.GenericSchema<CEExpressionInput> = v.union([
  v.pipe(
    v.string(),
    v.check((expr) => ce.parse(expr).isValid, "Ceci n'est pas une expression mathématique valide"),
    v.transform((input) => sanitize(ce.parse(input).json)),
  ),
  v.number(),
  v.tupleWithRest(
    [v.string()],
    v.lazy(() => Math),
  ),
])
type Math = v.InferInput<typeof Math>

const ExpressionInput = v.union([
  Math,
  v.pipe(
    v.looseObject({ json: Math }),
    v.transform((v) => v.json),
  ),
])
type ExpressionInput = v.InferInput<typeof ExpressionInput>

export const Expression = v.union([
  v.pipe(Math, v.transform(_expr)),
  v.custom<ReturnType<typeof _expr>>((value): value is ReturnType<typeof _expr> => {
    return typeof value === 'object' && value !== null && 'json' in value && 'latex' in value
  }),
])

export type Expression<T extends 'input' | 'output' = 'input'> = T extends 'input'
  ? v.InferInput<typeof Expression>
  : ReturnType<typeof _expr>

console.log('Catalan', _expr('G').json)

function _expr(input: Math) {
  const json = v.parse(Math, input)
  return {
    rawInput: input,
    json,
    abs: () => expr(['Abs', json]),
    args: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property args`)
      return json.slice(1) as Math[]
    },
    checkRoot: (root: ExpressionInput, x = 'x') =>
      expr(json)
        .subs({ [x]: v.parse(ExpressionInput, root) })
        .isEqual(0),
    degree: () => symapi.expr.degree({ expr: json }),
    delta: (x: string, a: ExpressionInput, b: ExpressionInput) => {
      const f = (t: ExpressionInput) => expr(json).subs({ [x]: v.parse(ExpressionInput, t) }).json
      return expr(['Subtract', f(b), f(a)]).simplify()
    },
    diff: (x = 'x') => expr(['Derivative', json, x]),
    encrypt: async () => expr(json).latex().then(encrypt),
    expand: () => expr(['Expand', json]),
    evaluate: () => ce.expr(json).evaluate(),
    N: () => Number(N(expr(json).evaluate())),
    factor: () => expr(['Factor', json]),
    func: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property func`)
      return json[0] as string
    },
    integrate: (...params: v.InferInput<typeof integrateParams>) =>
      expr(['Integrate', json, ...v.parse(integrateParams, params)]),
    isEqual: async (other: ExpressionInput, error: number = 0) => {
      if (error > 0) {
        const diff = expr(['Subtract', json, v.parse(ExpressionInput, other)])
          .abs()
          .N()
        return diff <= error
      }
      return await symapi.expr.equal({ expr1: json, expr2: v.parse(ExpressionInput, other) })
    },
    isTrue: () => symapi.expr.isTrue({ expr: json }),
    isFactored: () => symapi.expr.isFactored({ expr: json }),
    isPartialFractionDecomposition: () =>
      symapi.expr.isPartialFractionDecomposition({ expr: json }),
    latex: () => symapi.expr.latex({ expr: json }),
    matches: (other: ExpressionInput) =>
      symapi.expr.match({ expr1: json, expr2: v.parse(ExpressionInput, other) }),
    roots: (complex = false) => symapi.expr.roots({ expr: json, complex }),
    simplify: () => expr(['Simplify', json]),
    subs: (rawSubstitutions: Record<string, ExpressionInput>) => {
      const substitutions = v.parse(v.record(v.string(), ExpressionInput), rawSubstitutions)
      return expr(ce.expr(json).subs(substitutions).json)
    },
    toString: () => (typeof input === 'string' ? input : stringify(json)),
    toJSON: () => input,
  }
}

export function expr<T extends Math | undefined>(
  input: T,
): T extends undefined ? undefined : Expression<'output'> {
  if (input === undefined) return undefined as any
  return _expr(input) as any
}

const Quantity = v.union([
  Math,
  v.pipe(
    v.tuple([Math, Math]),
    v.transform((quantity) => ce.expr(['Quantity', ...quantity]).evaluate()),
  ),
])
type Quantity = v.InferInput<typeof Quantity>

export function quantity(qty: Quantity) {
  const json = v.parse(Quantity, qty)

  function apply(method: string, ...args: CEExpressionInput[]) {
    return ce.expr([method, ...args]).evaluate()
  }

  return {
    convert: (rawUnit: Quantity) => {
      const unit = v.parse(Quantity, rawUnit)
      return quantity(apply('UnitConvert', json, unit).json)
    },
    magnitude: () => expr(apply('QuantityMagnitude', json).json),
    subtract: (rawOther: Quantity) => {
      const other = v.parse(Quantity, rawOther)
      return quantity(apply('Subtract', json, other).json)
    },
    unit: () => apply('QuantityUnit', json).latex,
    json,

    async isEqual(rawExpr2: Quantity, rawError?: Quantity) {
      const expr2 = v.parse(Quantity, rawExpr2)
      const error = rawError ? v.parse(Quantity, rawError) : undefined
      if (!error) return this.subtract(expr2).magnitude().isEqual(0)
      const diff = this.subtract(expr2).convert(error).magnitude().abs().N()
      return diff < quantity(error).magnitude().abs().N()
    },
  }
}
