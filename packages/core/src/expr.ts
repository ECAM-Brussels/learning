import { type ExpressionInput, ComputeEngine, N } from '@cortex-js/compute-engine'
import * as v from 'valibot'
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

const Math: v.GenericSchema<ExpressionInput> = v.union([
  v.pipe(
    v.string(),
    v.check((expr) => ce.parse(expr).isValid, "Ceci n'est pas une expression mathématique valide"),
    v.transform((input) => ce.parse(input).json),
  ),
  v.number(),
  v.tupleWithRest(
    [v.string()],
    v.lazy(() => Math),
  ),
])
type Math = v.InferInput<typeof Math>

export const Expression = v.union([
  Math,
  v.pipe(
    v.looseObject({ json: Math }),
    v.transform((v) => v.json),
  ),
])
export type Expression = v.InferInput<typeof Expression>

function _expr(input: Math) {
  const json = v.parse(Math, input)
  return {
    rawInput: String(input),
    json,
    abs: () => expr(['Abs', json]),
    args: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property args`)
      return json.slice(1) as Math[]
    },
    checkRoot: (root: Expression, x = 'x') =>
      expr(json)
        .subs({ [x]: v.parse(Expression, root) })
        .isEqual(0),
    degree: () => symapi.expr.degree({ expr: json }),
    diff: (x = 'x') => expr(['Derivative', json, x]),
    expand: () => expr(['Expand', json]),
    evaluate: () => ce.expr(json).evaluate(),
    N: () => N(expr(json).evaluate()) as unknown as number,
    factor: () => expr(['Factor', json]),
    func: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property func`)
      return json[0] as string
    },
    integrate: (...params: v.InferInput<typeof integrateParams>) =>
      expr(['Integrate', json, ...v.parse(integrateParams, params)]),
    isEqual: (other: Expression) =>
      symapi.expr.equal({ expr1: json, expr2: v.parse(Expression, other) }),
    isFactored: () => symapi.expr.isFactored({ expr: json }),
    isPartialFractionDecomposition: () =>
      symapi.expr.isPartialFractionDecomposition({ expr: json }),
    latex: () => symapi.expr.latex({ expr: json }),
    matches: (other: Expression) =>
      symapi.expr.match({ expr1: json, expr2: v.parse(Expression, other) }),
    roots: (complex = false) => symapi.expr.roots({ expr: json, complex }),
    simplify: () => expr(['Simplify', json]),
    subs: (substitutions: Record<string, Math>) => expr(ce.expr(json).subs(substitutions).json),
  }
}

export function expr<T extends Math | undefined>(
  input: T,
): T extends undefined ? undefined : ReturnType<typeof _expr> {
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

  function apply(method: string, ...args: ExpressionInput[]) {
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
