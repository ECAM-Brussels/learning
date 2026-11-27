import {
  type ExpressionInput as CEExpressionInput,
  ComputeEngine,
  isNumber,
  type MathJsonExpression,
  N,
  PythonTarget,
} from '@cortex-js/compute-engine'
import { isEqual, mapAsync, mapValues, range, round } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import * as v from 'valibot'
import { encrypt } from './crypto'
import symapi from './symapi'

type MaybeAsync<T> = T | Promise<T>

const ce = new ComputeEngine()
const python = new PythonTarget()

function sanitize<T extends CEExpressionInput>(json: T): T {
  if (json === 'CatalanConstant') return 'G' as T
  if (json === 'i') return 'ImaginaryUnit' as T
  if (json === 'e') return 'ExponentialE' as T
  if (typeof json === 'number' || typeof json === 'string') return json
  if (Array.isArray(json)) return json.map(sanitize) as unknown as T
  return json
}

function hasErrorNode(json: MathJsonExpression): boolean {
  if (!Array.isArray(json)) return false
  const [head, ...args] = json as [string, ...MathJsonExpression[]]
  return head === 'Error' || args.some(hasErrorNode)
}

const Math = v.union([
  v.pipe(
    v.union([v.string(), v.number()]),
    v.transform((input) => ({
      rawInput: input,
      json: sanitize(ce.parse(String(input), { form: 'raw' }).json),
    })),
    v.check(
      ({ json }) => !hasErrorNode(json),
      ({ input }) => `Invalid LaTeX "${input.rawInput}": ${stringify(input.json)}`,
    ),
  ),
  v.pipe(
    v.tupleWithRest(
      [v.string()],
      v.custom<MathJsonExpression>(() => true),
    ),
    v.transform((json) => ({
      rawInput: sanitize(json) as MathJsonExpression,
      json: sanitize(json) as MathJsonExpression,
    })),
  ),
  v.pipe(
    v.object({
      rawInput: v.optional(
        v.union([v.string(), v.number(), v.custom<MathJsonExpression>(() => true)]),
      ),
      json: v.custom<MathJsonExpression>(() => true),
    }),
    v.transform(({ rawInput, json }) => ({
      rawInput: rawInput ?? sanitize(json),
      json: sanitize(json),
    })),
  ),
])
type Math = v.InferInput<typeof Math>

const undecided = <T>(result: Promise<T | null>) => result.then((r) => r ?? undefined)

/**
 * Compute Engine evaluates Mod with the sign of the dividend (-7 mod 3 = -1),
 * while sympy floors (-7 mod 3 = 2). Rewrite Mod as a - b floor(a / b) before
 * evaluating so both sides agree on the floored convention.
 */
function floorMod(json: MathJsonExpression): MathJsonExpression {
  if (!Array.isArray(json)) return json
  const [head, ...args] = json as [string, ...MathJsonExpression[]]
  const mapped = args.map(floorMod)
  if (head === 'Mod' && mapped.length === 2) {
    const [a, b] = mapped as [MathJsonExpression, MathJsonExpression]
    return ['Subtract', a, ['Multiply', b, ['Floor', ['Divide', a, b]]]]
  }
  return [head, ...mapped] as MathJsonExpression
}

const integrateParams = v.union([
  v.pipe(
    v.strictTuple([]),
    v.transform(() => ['x']),
  ),
  v.strictTuple([v.string()]),
  v.pipe(
    v.strictTuple([v.string(), Math, Math]),
    v.transform(([x, a, b]) => [['Tuple', x, a.json, b.json]] as const),
  ),
])

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
  const { rawInput, json } = v.parse(Math, input)
  const instructionOps = new Set([
    'Simplify',
    'Expand',
    'Factor',
    'Derivative',
    'Integrate',
    'Subs',
  ])

  const hasInstructionOp = (value: MathJsonExpression): boolean => {
    if (!Array.isArray(value)) return false
    const [head, ...tail] = value
    if (typeof head === 'string' && instructionOps.has(head)) return true
    return tail.some(hasInstructionOp)
  }

  return {
    rawInput,
    json,
    abs: () => expression({ json: ['Abs', json] }),
    arg: () => expression({ json: ['Argument', json] }),
    args: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property args`)
      return json.slice(1) as Math[]
    },
    apply: async () => expr(await expression({ json }).latex()),
    checkRoot: (root: Math, x = 'x') =>
      expression({ json })
        .subs({ [x]: root })
        .isEqual(0),
    conj: () => expression({ json: ['Conjugate', json] }),
    count: (symol: string) => {
      function _count(json: MathJsonExpression): number {
        if (json === symol) return 1
        if (!Array.isArray(json)) return 0
        const [_func, ...args] = json
        return args.reduce((sum, arg) => sum + _count(arg), 0)
      }
      return _count(json)
    },
    degree: (x = 'x') =>
      symapi.expr.degree({ expr: json, x }).then((d) => (d === null ? -Infinity : d)),
    delta: (x: string, a: Math, b: Math) => {
      const f = (t: Math) => expression({ json }).subs({ [x]: t }).json
      return expression({ json: ['Subtract', f(b), f(a)] }).simplify()
    },
    diff: (x = 'x', at?: Math) => {
      const derivative: MathJsonExpression = ['Derivative', json, x]
      if (at === undefined) return expression({ json: derivative })
      return expression({ json: ['Subs', derivative, x, v.parse(Math, at).json] })
    },
    encrypt: async () => Promise.resolve(expression({ json }).latex()).then(encrypt),
    expand: () => expression({ json: ['Expand', json] }),
    evaluate: () => ce.expr(floorMod(json)).evaluate(),
    geq: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'geq' }),
      ),
    gt: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'gt' }),
      ),
    hasSymbol: () => {
      function findSymbol(json: MathJsonExpression): boolean {
        if (Array.isArray(json) && json.length > 1) {
          const [_func, ...args] = json
          return args.map(findSymbol).some((v) => v === true)
        }
        return typeof json === 'string'
      }
      return findSymbol(json)
    },
    factor: () => expression({ json: ['Factor', json] }),
    func: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property func`)
      return json[0] as string
    },
    imaginary: () => expression({ json: ['Imaginary', json] }),
    in: (set: Math) =>
      undecided(symapi.expr.inSet({ expr1: json, expr2: v.parse(Math, set).json })),
    integrate: (...params: v.InferInput<typeof integrateParams>) =>
      expression({ json: ['Integrate', json, ...v.parse(integrateParams, params)] }),
    isEqual: async (other: MaybeAsync<Math>, error: number = 0) => {
      if (error > 0) {
        const self = hasInstructionOp(json) ? (await expression({ json }).apply()).json : json
        const diff = expression({ json: ['Subtract', self, v.parse(Math, await other).json] })
          .abs()
          .N()
        return diff <= error
      }
      return await symapi.expr.equal({ expr1: json, expr2: v.parse(Math, await other).json })
    },
    isComplexRectangular: () => {
      const isReal = (expr: MathJsonExpression) => ce.expr(expr).isReal
      const isImaginary = (expr: MathJsonExpression): boolean => {
        if (expr === 'ImaginaryUnit') return true
        if (
          Array.isArray(expr) &&
          ['InvisibleOperator', 'Multiply'].includes(expr[0]) &&
          expr.length === 3 &&
          isReal(expr[1]) &&
          expr[2] === 'ImaginaryUnit'
        )
          return true
        if (Array.isArray(expr) && expr[0] === 'Negate' && expr.length === 2)
          return isImaginary(expr[1])
        return false
      }

      if (isReal(json) || isImaginary(json)) return true
      if (
        Array.isArray(json) &&
        ['Add', 'Subtract'].includes(json[0]) &&
        json.length === 3 &&
        isReal(json[1]) &&
        isImaginary(json[2])
      ) {
        return true
      }

      return false
    },
    isComplexExponential: () => {
      function isUnitExponential(json: MathJsonExpression) {
        if (Array.isArray(json) && json[0] === 'Power' && json.length === 3) {
          const [_, base, exponent] = json
          if (
            base === 'ExponentialE' &&
            ['Multiply', 'InvisibleOperator'].includes(exponent[0]) &&
            exponent.length === 3 &&
            (exponent[1] === 'ImaginaryUnit' ||
              (Array.isArray(exponent[1]) &&
                exponent[1][0] === 'Negate' &&
                exponent[1][1] === 'ImaginaryUnit')) &&
            ce.expr(exponent[2]).isReal
          )
            return true
        }
        return false
      }
      if (isUnitExponential(json)) return true
      if (
        Array.isArray(json) &&
        ['Multiply', 'InvisibleOperator'].includes(json[0]) &&
        json.length === 3
      ) {
        const [_, a, b] = json
        if (ce.expr(a).isNonNegative && isUnitExponential(b)) return true
      }
      return false
    },
    isComplexPolar: () => {
      function unwrap(json: MathJsonExpression): MathJsonExpression {
        if (Array.isArray(json) && json.length > 1) {
          const [func, ...args] = json
          if (func === 'Delimiter') return unwrap(args[0])
          return [func, ...args.map(unwrap)] as MathJsonExpression
        }
        return json
      }

      function isUnitPolar(json: MathJsonExpression) {
        if (Array.isArray(json) && ['Add', 'Subtract'].includes(json[0]) && json.length === 3) {
          const [_, a, b] = json
          if (
            a[0] === 'Cos' &&
            ce.expr(a[1]).isReal &&
            ['InvisibleOperator', 'Multiply'].includes(b[0]) &&
            b.length === 3 &&
            b[1] === 'ImaginaryUnit' &&
            b[2][0] === 'Sin' &&
            ce.expr(b[2][1]).isReal
          ) {
            return isEqual(a[1], b[2][1])
          }
        }
        return false
      }

      const _json = unwrap(json)
      if (isUnitPolar(_json)) return true
      if (
        Array.isArray(_json) &&
        ['Multiply', 'InvisibleOperator'].includes(_json[0]) &&
        _json.length === 3
      ) {
        const [_, a, b] = _json
        if (ce.expr(a).isNonNegative && isUnitPolar(b)) return true
      }
      return false
    },
    isEquivalent: async (other: MaybeAsync<Math>) =>
      symapi.expr.equivalent({ expr1: json, expr2: v.parse(Math, await other).json }),
    isExpanded: () => symapi.expr.isExpanded({ expr: json }),
    isSymbol: () => typeof json === 'string',
    isTrue: () => symapi.expr.isTrue({ expr: json }),
    isFactored: () => symapi.expr.isFactored({ expr: json }),
    isPartialFractionDecomposition: () =>
      symapi.expr.isPartialFractionDecomposition({ expr: json }),
    latex: () => {
      try {
        const evaluated = ce.expr(json, { form: 'raw' }).evaluate()
        if (hasInstructionOp(evaluated.json)) return symapi.expr.latex({ expr: json })
        return evaluated.latex
      } catch {
        return symapi.expr.latex({ expr: json })
      }
    },
    leq: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'leq' }),
      ),
    lt: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'lt' }),
      ),
    matches: (other: Math) => symapi.expr.match({ expr1: json, expr2: v.parse(Math, other).json }),
    mod: (other: Math) => expression({ json: ['Mod', json, v.parse(Math, other).json] }),
    multiply: (other: Math) => expression({ json: ['Multiply', json, v.parse(Math, other).json] }),
    N: (precision?: number) => {
      // `Number(boxed)` silently returns 0 for anything that isn't a real
      // literal (symbols, complex numbers, ComplexInfinity, ...), so read
      // the real/imaginary parts explicitly and return NaN instead.
      const n = N(expression({ json }).evaluate())
      const result = isNumber(n) && n.im === 0 ? n.re : NaN
      return precision === undefined ? result : round(result, precision)
    },
    python: <T extends boolean = false>(sympy?: T): T extends false ? string : Promise<string> => {
      if (!sympy) return python.compile(ce.expr(json)).code as any
      else
        return expr({ json })
          .apply()
          .then((e) => e.python(false)) as any
    },
    real: () => expression({ json: ['Real', json] }),
    roots: (complex = false) => symapi.expr.roots({ expr: json, complex }),
    simplify: () => expression({ json: ['Simplify', json] }),
    subs: (rawSubstitutions: Record<string, Math>) => {
      const substitutions = mapValues(
        v.parse(v.record(v.string(), Math), rawSubstitutions),
        (v) => v.json,
      )
      // Instructions such as Derivative/Integrate bind their variable:
      // substituting into them directly would turn d/dx x^2 into d/d3 3^2.
      // Defer the substitution to sympy with a Subs node instead.
      if (hasInstructionOp(json)) {
        const keys = Object.keys(substitutions)
        if (keys.length === 0) return expression({ json })
        const values = keys.map((k) => substitutions[k]!)
        return expression({
          json:
            keys.length === 1
              ? ['Subs', json, keys[0]!, values[0]!]
              : ['Subs', json, ['Tuple', ...keys], ['Tuple', ...values]],
        })
      }
      return expression({ json: ce.expr(json, { form: 'raw' }).subs(substitutions).json })
    },
    solve: (x: Math = 'x', complex = false) =>
      set(['Solve', json, v.parse(Math, x).json, complex ? 'ComplexNumbers' : 'RealNumbers']),
    subtract: (other: Math) => expression({ json: ['Subtract', json, v.parse(Math, other).json] }),
    taylor: (x: Math, a: Math, n: number) =>
      expression({
        json: ['Normal', ['Series', json, v.parse(Math, x).json, v.parse(Math, a).json, n]],
      }),
    toString: () => (typeof input === 'string' ? input : stringify(json)),
    toJSON: () => (typeof input === 'string' ? input : { json }),
    unit: (unit: Unit) => quantity({ json }, unit),
  }
}

type QuantityJson = readonly ['Quantity', MathJsonExpression, MathJsonExpression]

const isQuantityJson = (json: unknown): json is QuantityJson =>
  Array.isArray(json) && json[0] === 'Quantity' && json.length === 3

const Unit = v.pipe(
  v.custom<MathJsonExpression>(() => true),
  v.transform((rawUnit) => {
    const unit =
      typeof rawUnit === 'string' && rawUnit.includes('\\') ? ce.parse(rawUnit).json : rawUnit
    const json = ce.expr(['Quantity', 1, unit]).json
    return isQuantityJson(json) ? json[2] : unit
  }),
  // Compute Engine reads N (newton) inside a compound unit as its N() function and leaves an
  // Error node: reject it here, or isEqual would quietly grade every such answer as wrong.
  v.check(
    (unit) => !hasErrorNode(unit),
    ({ input }) => `Invalid unit: ${stringify(input)}`,
  ),
  // Compute Engine takes any symbol for a unit, but cannot convert an unknown one, even to itself.
  v.check(
    (unit) =>
      hasErrorNode(unit) ||
      isQuantityJson(ce.expr(['UnitConvert', ['Quantity', 1, unit], unit]).evaluate().json),
    ({ input }) => `Unknown unit: ${stringify(input)}`,
  ),
)
type Unit = v.InferInput<typeof Unit>

const quantityJson = (magnitude: MathJsonExpression, unit: MathJsonExpression) =>
  ['Quantity', typeof magnitude === 'number' ? String(magnitude) : magnitude, unit] as const

/** A quantity, or what one is made from: `[magnitude, unit]`, `['Quantity', magnitude, unit]` or `{ magnitude, unit }`. */
const QuantityValue = v.union([
  v.pipe(
    v.custom<{ json: QuantityJson }>(
      (value) => typeof value === 'object' && value !== null && isQuantityJson((value as any).json),
    ),
    v.transform(({ json }) => json),
  ),
  v.pipe(
    v.tuple([v.literal('Quantity'), Math, Unit]),
    v.transform(([_, magnitude, unit]) => quantityJson(magnitude.json, unit)),
  ),
  v.pipe(
    v.tuple([Math, Unit]),
    v.transform(([magnitude, unit]) => quantityJson(magnitude.json, unit)),
  ),
  v.pipe(
    v.looseObject({ magnitude: Expression, unit: Unit }),
    v.transform(({ magnitude, unit }) => quantityJson(magnitude.json, unit)),
  ),
])
export type QuantityLike = v.InferInput<typeof QuantityValue>

const QuantityArgs = v.union([
  v.pipe(
    v.tuple([v.literal('Quantity'), Math, Unit]),
    v.transform(([_, magnitude, unit]) => quantityJson(magnitude.json, unit)),
  ),
  v.pipe(
    v.tuple([Math, Unit]),
    v.transform(([magnitude, unit]) => quantityJson(magnitude.json, unit)),
  ),
  v.pipe(
    v.tuple([QuantityValue]),
    v.transform(([json]) => json),
  ),
])

export function quantity(...rawQuantity: v.InferInput<typeof QuantityArgs>) {
  const result = v.safeParse(QuantityArgs, rawQuantity)
  if (!result.success)
    throw new Error(
      `La quantité ${JSON.stringify(rawQuantity)} n'a pas pu être parsée:\n${JSON.stringify(result.issues, null, 2)}`,
    )
  const json = result.output

  function evaluate(method: string, ...args: MathJsonExpression[]) {
    return ce.expr([method, ...args]).evaluate().json
  }

  function apply(method: string, ...args: MathJsonExpression[]) {
    const json = evaluate(method, ...args)
    if (!isQuantityJson(json))
      throw new Error(
        `Expected a Quantity as result of applying ${method} to ${stringify(args)}, but got ${stringify(json)}`,
      )
    return quantity({ json: json[1] }, json[2])
  }

  const compatible = (other: QuantityJson) =>
    isQuantityJson(evaluate('UnitConvert', other, json[2] as MathJsonExpression))

  return {
    convert: (unit: Unit) => apply('UnitConvert', json, v.parse(Unit, unit)),
    magnitude: expression({ json: json[1] }),
    subtract: (other: QuantityLike) => apply('Subtract', json, v.parse(QuantityValue, other)),
    unit: json[2],
    json,
    /**
     * False when the units measure different things, undefined when Compute Engine cannot tell
     * (e.g. symbolic magnitudes). The tolerance is in the unit of `other` unless it has its own.
     */
    isEqual: async (
      rawOther: QuantityLike,
      options: { tolerance?: number | QuantityLike } = {},
    ): Promise<boolean | undefined> => {
      const other = v.parse(QuantityValue, rawOther)
      if (!compatible(other)) return false
      const tolerance =
        options.tolerance === undefined || typeof options.tolerance === 'number'
          ? quantity(options.tolerance ?? 0, other[2])
          : quantity(options.tolerance)
      if (!compatible(tolerance.json))
        throw new Error(
          `The tolerance ${stringify(tolerance.json)} is not in a unit compatible with ${stringify(json)}`,
        )
      const difference = apply('Subtract', json, other)
        .convert(tolerance.unit as Unit)
        .magnitude.abs()
        .N()
      if (Number.isNaN(difference)) return undefined
      return difference <= tolerance.magnitude.N()
    },
    latex: () => ce.expr(json, { form: 'raw' }).latex,
    N: (precision?: number) => quantity(expression({ json: json[1] }).N(precision), json[2]),
    rawInput: rawQuantity,
    toJSON: () => rawQuantity,
  }
}

export function set(input: Math) {
  const json = v.parse(Math, input).json
  return {
    json,
    intersect: (other: Math) => set(['Intersect', json, v.parse(Math, other).json]),
    isSubset: async (other: Math) =>
      symapi.expr.subset({ expr1: json, expr2: v.parse(Math, other).json }),
    isEqual: async (other: Math) =>
      symapi.expr.setEqual({ expr1: json, expr2: v.parse(Math, other).json }),
  }
}

const isVector = (value: unknown): value is { components: ReturnType<typeof expression>[] } =>
  typeof value === 'object' && value !== null && 'components' in value && 'cross' in value

/** A vector, or the list of its components. */
const VectorValue = v.union([
  v.pipe(
    v.custom<{ components: ReturnType<typeof expression>[] }>(isVector),
    v.transform(({ components }) => components.map(({ rawInput, json }) => ({ rawInput, json }))),
  ),
  v.array(Math),
])
export type VectorLike = v.InferInput<typeof VectorValue>

// Results are kept in canonical form, which folds numbers (0 × 1 - 1 × 0 = 0)
// but leaves symbolic terms as written.
const canonical = (json: MathJsonExpression) => ce.expr(json).json

export function vector(rawInput: VectorLike) {
  const components = v.parse(VectorValue, rawInput)
  const fromJson = (jsons: MathJsonExpression[]) =>
    vector(jsons.map((json) => ({ json: canonical(json) })))
  const sameDimension = (rawOther: VectorLike, operation: string) => {
    const other = v.parse(VectorValue, rawOther)
    if (components.length !== other.length)
      throw new Error(`Cannot compute the ${operation} of vectors of different dimensions`)
    return other
  }
  const componentwise = (rawOther: VectorLike, operation: 'Add' | 'Subtract') => {
    const other = sameDimension(rawOther, operation === 'Add' ? 'sum' : 'difference')
    return fromJson(components.map((c, i) => [operation, c.json, other[i]!.json]))
  }

  const isZero = (list: typeof components) => list.every((c) => canonical(c.json) === 0)

  /**
   * The λ such that other = λ · this, or undefined if other is not a multiple of this.
   * Decided on canonical forms, without SymAPI: exact for numbers, not for every symbolic vector.
   */
  const ratio = (rawOther: VectorLike) => {
    const other = sameDimension(rawOther, 'ratio')
    const pivot = components.findIndex((c) => canonical(c.json) !== 0)
    if (pivot === -1) return undefined
    const lambda = canonical(['Divide', other[pivot]!.json, components[pivot]!.json])
    const multiple = components.every((c, i) =>
      isEqual(canonical(['Multiply', lambda, c.json]), canonical(other[i]!.json)),
    )
    return multiple ? expression({ json: lambda }) : undefined
  }

  return {
    components: components.map((c) => expression(c)),
    dimension: components.length,
    json: ['List', ...components.map((c) => c.json)] as MathJsonExpression,
    rawInput,
    toJSON: () => rawInput,
    add: (other: VectorLike) => componentwise(other, 'Add'),
    subtract: (other: VectorLike) => componentwise(other, 'Subtract'),
    scale: (factor: Math) => {
      const k = v.parse(Math, factor).json
      return fromJson(components.map((c) => ['Multiply', k, c.json]))
    },
    cross: (rawOther: VectorLike) => {
      const other = v.parse(VectorValue, rawOther)
      if (components.length !== 3 || other.length !== 3)
        throw new Error(`Cross product is only defined for 3-dimensional vectors`)
      const [a, b] = [components.map((c) => c.json), other.map((c) => c.json)]
      const minor = (i: number, j: number): MathJsonExpression => [
        'Subtract',
        ['Multiply', a[i]!, b[j]!],
        ['Multiply', a[j]!, b[i]!],
      ]
      return fromJson([minor(1, 2), minor(2, 0), minor(0, 1)])
    },
    dot: (rawOther: VectorLike) => {
      const other = sameDimension(rawOther, 'dot product')
      return expression({
        json: canonical([
          'Add',
          ...components.map((c, i) => ['Multiply', c.json, other[i]!.json] as const),
        ]),
      })
    },
    isEqual: async (rawOther: VectorLike) => {
      const other = v.parse(VectorValue, rawOther)
      if (components.length !== other.length) return false
      const results = await mapAsync(range(components.length), async (i) =>
        expression(components[i]!).isEqual(other[i]!),
      )
      return results.every(Boolean)
    },
    latex: async () => {
      const c = await mapAsync(components, (component) =>
        Promise.resolve(expression(component).latex()),
      )
      return `\\begin{bmatrix}${c.join('\\\\')}\\end{bmatrix}`
    },
    ratio,
    /**
     * Whether this and other are linearly dependent, i.e. one is a multiple of the other.
     * Symmetric, and the zero vector is parallel to every vector.
     * Decided on canonical forms, like ratio.
     */
    isParallel: (rawOther: VectorLike) => {
      const other = sameDimension(rawOther, 'parallelism')
      return isZero(components) || isZero(other) || ratio(other) !== undefined
    },
    isZero: () => isZero(components),
    N: () => components.map((c) => expression(c).N()),
    norm: () =>
      expression({
        json: canonical(['Sqrt', ['Add', ...components.map((c) => ['Power', c.json, 2] as const)]]),
      }),
    simplify: () => vector(components.map((c) => ({ json: ['Simplify', c.json] }))),
  }
}

const isVectorObject = (value: unknown): value is ReturnType<typeof vector> =>
  isVector(value) && 'ratio' in value

/** A vector field of a step: given as the list of its components, used as a vector. */
export const Vector = v.union([
  v.custom<ReturnType<typeof vector>>(isVectorObject),
  v.pipe(
    // Not v.array(Math), whose output would replace the components as written in what is saved.
    v.array(v.custom<v.InferInput<typeof Math>>((component) => v.is(Math, component))),
    v.transform((components) => vector(components)),
  ),
])
export type Vector = ReturnType<typeof vector>

export type Quantity = ReturnType<typeof quantity>

export function expr(input: undefined, type?: undefined): undefined
export function expr(input: Math, type?: undefined): Expression<'output'>
export function expr(input: Math, type: 'set'): ReturnType<typeof set>
export function expr(input: VectorLike, type: 'vector'): ReturnType<typeof vector>
export function expr(input: Math, type: string): Quantity
export function expr(input?: Math | VectorLike, type?: string) {
  if (input === undefined) return undefined
  if (type === undefined) return expression(input as Math)
  if (type === 'vector') return vector(input as VectorLike)
  if (type === 'set') return set(input as Math)
  return quantity(input as Math, type)
}
