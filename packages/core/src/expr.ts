import {
  type ExpressionInput as CEExpressionInput,
  ComputeEngine,
  N,
} from '@cortex-js/compute-engine'
import { round } from 'es-toolkit'
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
  v.pipe(Math, v.transform(expression)),
  v.custom<ReturnType<typeof expression>>((value): value is ReturnType<typeof expression> => {
    return typeof value === 'object' && value !== null && 'json' in value && 'latex' in value
  }),
])

export type Expression<T extends 'input' | 'output' = 'input'> = T extends 'input'
  ? v.InferInput<typeof Expression>
  : ReturnType<typeof expression>

function expression(input: Math) {
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
    N: (precision?: number) => {
      const result = Number(N(expr(json).evaluate()))
      return precision === undefined ? result : round(result, precision)
    },
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

const Unit = v.pipe(
  v.custom<CEExpressionInput>(() => true),
  v.transform(
    (unit) =>
      (
        ce.expr(['Quantity', '1', unit]).evaluate().json as [
          'Quantity',
          CEExpressionInput,
          CEExpressionInput,
        ]
      )[2],
  ),
)
type Unit = v.InferInput<typeof Unit>

const QuantityInput = v.union([
  v.tuple([v.literal('Quantity'), ExpressionInput, Unit]),
  v.pipe(
    v.tuple([ExpressionInput, Unit]),
    v.transform(([magnitude, unit]) => ['Quantity', magnitude, unit] as const),
  ),
  v.pipe(
    v.tuple([v.looseObject({ magnitude: Expression, unit: Unit })]),
    v.transform(([v]) => ['Quantity', v.magnitude.json, v.unit] as const),
  ),
])

const QuantityWithError = v.union([
  v.tuple([QuantityInput, v.number()]),
  v.pipe(
    QuantityInput,
    v.transform((quantity) => [quantity, 0] as const),
  ),
])

export function quantity(...rawQuantity: v.InferInput<typeof QuantityInput>) {
  const json = v.parse(QuantityInput, rawQuantity)

  function apply(method: string, ...args: CEExpressionInput[]) {
    const json = ce.expr([method, ...args]).evaluate().json
    if (!Array.isArray(json) || json[0] !== 'Quantity' || json.length !== 3)
      throw new Error(`Expected a Quantity as result of applying ${method} to ${stringify(args)}`)
    return quantity(json[1], json[2])
  }

  return {
    convert: (unit: Unit) => apply('UnitConvert', json, v.parse(Unit, unit)),
    magnitude: expr(json[1]),
    subtract: (...rawOther: v.InferInput<typeof QuantityInput>) =>
      apply('Subtract', json, v.parse(QuantityInput, rawOther)),
    unit: json[2],
    json,
    isEqual: (...rawArgs: v.InferInput<typeof QuantityWithError>) => {
      const [other, error] = v.parse(QuantityWithError, rawArgs)
      return (
        quantity(json[1], json[2])
          .subtract(...other)
          .convert(other[2])
          .magnitude.N() <= error
      )
    },
    latex: () => ce.expr(json).latex,
  }
}

export type Quantity = ReturnType<typeof quantity>

export function expr(input: undefined, unit?: undefined): undefined
export function expr(input: Math, unit?: undefined): Expression<'output'>
export function expr(input: Math, unit: string): Quantity
export function expr(input?: Math, unit?: string) {
  if (input === undefined) return undefined
  if (unit === undefined) return expression(input)
  return quantity(input, unit)
}
