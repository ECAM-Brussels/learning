import {
  type ExpressionInput as CEExpressionInput,
  ComputeEngine,
  type MathJsonExpression,
  N,
} from '@cortex-js/compute-engine'
import { mapValues, round } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import * as v from 'valibot'
import { encrypt } from './crypto'
import symapi from './symapi'

type MaybeAsync<T> = T | Promise<T>

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

const Math = v.union([
  v.pipe(
    v.union([v.string(), v.number()]),
    v.transform((input) => ({ json: sanitize(ce.parse(String(input), { form: 'raw' }).json) })),
  ),
  v.object({ json: v.custom<MathJsonExpression>(() => true) }),
])
type Math = v.InferInput<typeof Math>

export const Expression = v.union([
  v.pipe(
    Math,
    v.transform((s) => expression(s)),
  ),
  v.custom<ReturnType<typeof expression>>((value): value is ReturnType<typeof expression> => {
    return typeof value === 'object' && value !== null && 'json' in value && 'latex' in value
  }),
])

export type Expression<T extends 'input' | 'output' = 'input'> = T extends 'input'
  ? v.InferInput<typeof Expression>
  : ReturnType<typeof expression>

function expression(input: Math) {
  const { json } = v.parse(Math, input)
  return {
    rawInput: input,
    json,
    abs: () => expression({ json: ['Abs', json] }),
    args: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property args`)
      return json.slice(1) as Math[]
    },
    checkRoot: (root: Math, x = 'x') =>
      expression({ json })
        .subs({ [x]: root })
        .isEqual(0),
    degree: () => symapi.expr.degree({ expr: json }),
    delta: (x: string, a: Math, b: Math) => {
      const f = (t: Math) => expression({ json }).subs({ [x]: t }).json
      return expression({ json: ['Subtract', f(b), f(a)] }).simplify()
    },
    diff: (x = 'x') => expression({ json: ['Derivative', json, x] }),
    encrypt: async () => expression({ json }).latex().then(encrypt),
    expand: () => expression({ json: ['Expand', json] }),
    evaluate: () => ce.expr(json).evaluate(),
    N: (precision?: number) => {
      const result = Number(N(expression({ json }).evaluate()))
      return precision === undefined ? result : round(result, precision)
    },
    factor: () => expression({ json: ['Factor', json] }),
    func: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property func`)
      return json[0] as string
    },
    integrate: (...params: v.InferInput<typeof integrateParams>) =>
      expression({ json: ['Integrate', json, ...v.parse(integrateParams, params)] }),
    isEqual: async (other: MaybeAsync<Math>, error: number = 0) => {
      if (error > 0) {
        const diff = expression({ json: ['Subtract', json, v.parse(Math, await other).json] })
          .abs()
          .N()
        return diff <= error
      }
      return await symapi.expr.equal({ expr1: json, expr2: v.parse(Math, await other).json })
    },
    isTrue: () => symapi.expr.isTrue({ expr: json }),
    isFactored: () => symapi.expr.isFactored({ expr: json }),
    isPartialFractionDecomposition: () =>
      symapi.expr.isPartialFractionDecomposition({ expr: json }),
    latex: () => symapi.expr.latex({ expr: json }),
    matches: (other: Math) => symapi.expr.match({ expr1: json, expr2: v.parse(Math, other).json }),
    roots: (complex = false) => symapi.expr.roots({ expr: json, complex }),
    simplify: () => expression({ json: ['Simplify', json] }),
    subs: (rawSubstitutions: Record<string, Math>) => {
      const substitutions = mapValues(
        v.parse(v.record(v.string(), Math), rawSubstitutions),
        (v) => v.json,
      )
      return expression({ json: ce.expr(json, { form: 'raw' }).subs(substitutions).json })
    },
    toString: () => (typeof input === 'string' ? input : stringify(json)),
    toJSON: () => input,
    unit: (unit: Unit) => quantity({ json }, unit),
  }
}

const Unit = v.pipe(
  v.custom<MathJsonExpression>(() => true),
  v.transform((unit) => {
    if (typeof unit === 'string' && unit.includes('\\')) return ce.parse(unit).json
    return unit
  }),
)
type Unit = v.InferInput<typeof Unit>

const QuantityInput = v.union([
  v.pipe(
    v.tuple([v.literal('Quantity'), Math, Unit]),
    v.transform(([_, magnitude, unit]) => ['Quantity', magnitude.json, unit] as const),
  ),
  v.pipe(
    v.tuple([Math, Unit]),
    v.transform(([magnitude, unit]) => ['Quantity', String(magnitude.json), unit] as const),
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
  const result = v.safeParse(QuantityInput, rawQuantity)
  if (!result.success)
    throw new Error(
      `La quantité ${JSON.stringify(rawQuantity)} n'a pas pu être parsée:\n${JSON.stringify(result.issues, null, 2)}`,
    )
  const json = result.output

  function apply(method: string, ...args: MathJsonExpression[]) {
    const json = ce.expr([method, ...args]).evaluate().json
    if (!Array.isArray(json) || json[0] !== 'Quantity' || json.length !== 3)
      throw new Error(
        `Expected a Quantity as result of applying ${method} to ${stringify(args)}, but got ${stringify(json)}`,
      )
    return quantity(json[1], json[2])
  }

  return {
    convert: (unit: Unit) => apply('UnitConvert', json, v.parse(Unit, unit)),
    magnitude: expression({ json: json[1] }),
    subtract: (...rawOther: v.InferInput<typeof QuantityInput>) =>
      apply('Subtract', json, v.parse(QuantityInput, rawOther)),
    unit: json[2],
    json,
    isEqual: async (...rawArgs: v.InferInput<typeof QuantityWithError>) => {
      const [other, error] = v.parse(QuantityWithError, rawArgs)
      try {
        return (
          quantity({ json: json[1] }, json[2])
            .subtract({ json: other[1] }, other[2])
            .convert(other[2])
            .magnitude.N() <= error
        )
      } catch {
        return false
      }
    },
    latex: () => ce.expr(json, { form: 'raw' }).latex,
    N: (precision?: number) => quantity(expression({ json: json[1] }).N(precision), json[2]),
    rawInput: rawQuantity,
    toJSON: () => rawQuantity,
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
