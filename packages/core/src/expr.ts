import {
  type ExpressionInput as CEExpressionInput,
  ComputeEngine,
  isNumber,
  type MathJsonExpression,
  N,
  PythonTarget,
} from '@cortex-js/compute-engine'
import {
  type DimensionVector,
  findNamedUnit,
  getExpressionDimension,
} from '@cortex-js/compute-engine/numerics'
import { isEqual, mapAsync, mapValues, range, round } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import * as v from 'valibot'
import { encrypt } from './crypto'
import {
  fractionParts,
  frenchIntervals,
  hasDecimal,
  hasDecimalNumber,
  isSimplified,
  significantFigures,
  writtenDecimals,
} from './form'
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

function parseValid(latex: string) {
  const json = ce.parse(latex, { form: 'raw' }).json
  return hasErrorNode(json) ? undefined : sanitize(json)
}

// Quantities and vectors also have `json` and `latex`: only this tells an expression apart.
const brand = Symbol('expression')

type RawInput = string | number | MathJsonExpression

const MathInput = v.union([
  v.pipe(
    v.union([v.string(), v.number()]),
    v.transform((input) => {
      // 3{,}14 is how LaTeX writes a decimal comma.
      const latex = String(input).replace(/(\d)\{,\}(\d)/g, '$1.$2')
      const json = ce.parse(latex, { form: 'raw' }).json
      const intervals = hasErrorNode(json) ? frenchIntervals(latex, parseValid) : undefined
      return { rawInput: input, json: sanitize(intervals ?? json) }
    }),
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
    v.custom<{ rawInput: RawInput; json: MathJsonExpression }>(
      (value) => typeof value === 'object' && value !== null && brand in value,
    ),
    v.transform(({ rawInput, json }) => ({ rawInput, json })),
  ),
  // Strict, so that a quantity or a vector is not taken for an expression.
  v.pipe(
    v.strictObject({
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
type MathInput = v.InferInput<typeof MathInput>

const undecided = <T>(result: Promise<T | null>) => result.then((r) => r ?? undefined)

const jsonOf = (input: MathInput) => v.parse(MathInput, input).json

/** Operations Compute Engine leaves to SymAPI, which carries them out. */
const instructionOps = new Set([
  'Simplify',
  'Expand',
  'Factor',
  'Derivative',
  'Integrate',
  'Subs',
  'Limit',
])

const relations = new Set(['Equal', 'NotEqual', 'Less', 'LessEqual', 'Greater', 'GreaterEqual'])

function hasInstructionOp(value: MathJsonExpression): boolean {
  if (!Array.isArray(value)) return false
  const [head, ...tail] = value
  if (typeof head === 'string' && instructionOps.has(head)) return true
  return tail.some(hasInstructionOp)
}

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
    v.strictTuple([v.string(), MathInput, MathInput]),
    v.transform(([x, a, b]) => [['Tuple', x, a.json, b.json]] as const),
  ),
])

export const Expression = v.union([
  v.pipe(
    MathInput,
    v.transform((s) => expression(s)),
  ),
  v.custom<ReturnType<typeof expression>>(
    (value): value is ReturnType<typeof expression> =>
      typeof value === 'object' && value !== null && brand in value,
  ),
])

/**
 * A mathematical expression.
 * `Expression<'input'>` is what can be given where an expression is expected:
 * LaTeX such as `'x^2 - 1'`, a number, MathJSON, or an expression.
 * `Expression<'output'>` is what `expr` makes:
 * an object with the operations of computer algebra, such as `diff`, `isEqual` or `factor`.
 * In a step's schema, `'expr'` declares data or an input of this kind.
 */
export type Expression<T extends 'input' | 'output' = 'input'> = T extends 'input'
  ? v.InferInput<typeof Expression>
  : ReturnType<typeof expression>

function expression(input: MathInput) {
  return build(v.parse(MathInput, input))
}

/** An expression from MathJSON already sanitized, as operations make, without parsing it again. */
const node = (json: MathJsonExpression) => build({ rawInput: json, json })

function build({ rawInput, json }: v.InferOutput<typeof MathInput>) {
  const compare = (comparison: 'gt' | 'geq' | 'lt' | 'leq') => (other: MathInput) =>
    undecided(symapi.expr.compare({ expr1: json, expr2: jsonOf(other), comparison }))

  /** The result of Compute Engine, when it can carry out every pending operation itself. */
  const evaluateLocally = () => {
    if (stringify(json).includes('"Limit"')) return undefined
    try {
      const evaluated = ce.expr(json, { form: 'raw' }).evaluate()
      return hasInstructionOp(evaluated.json) ? undefined : evaluated
    } catch {
      return undefined
    }
  }

  const written =
    typeof rawInput === 'string' || typeof rawInput === 'number' ? String(rawInput) : undefined

  const side = (index: 1 | 2) => {
    if (!Array.isArray(json) || !relations.has(json[0] as string))
      throw new Error(`Only equations and inequalities have sides: ${stringify(json)}`)
    return node(json[index]!)
  }

  // The LaTeX or number as written; MathJSON otherwise, and for a symbol given as MathJSON,
  // such as 'Pi', which would read back as LaTeX as P times i.
  const saved =
    typeof rawInput === 'number' || (typeof rawInput === 'string' && rawInput !== json)
      ? rawInput
      : { json }

  function toPython(sympy?: false): string
  function toPython(sympy: true): Promise<string>
  function toPython(sympy: boolean): string | Promise<string>
  function toPython(sympy = false): string | Promise<string> {
    if (!sympy) return python.compile(ce.expr(json)).code
    return node(json)
      .apply()
      .then((e) => e.python())
  }

  return {
    [brand]: true as const,
    /**
     * The input as it was given: the LaTeX string, or the MathJSON.
     */
    rawInput,
    /**
     * The expression in MathJSON, the form Compute Engine and SymAPI read:
     * `x + 1` is `['Add', 'x', 1]`.
     */
    json,
    /**
     * The absolute value, as a new expression:
     * for a complex number, its modulus.
     * It is displayed as written, `|-3|`: compare it, or get its value with `N`.
     *
     * @example
     * expr('-3').abs().N() // 3
     * await expr('3 + 4i').abs().isEqual(5) // true
     */
    abs: () => node(['Abs', json]),
    /**
     * The argument of a complex number, in radians, as a new expression.
     * It is displayed as written, `arg(i)`: compare it to get its value.
     *
     * @example
     * await expr('i').arg().isEqual('\\frac{\\pi}{2}') // true
     */
    arg: () => node(['Argument', json]),
    /**
     * The operands of the outermost operation, which `func` names, in MathJSON:
     * for `x + 2y`, `x` and `2y`.
     * It throws for a number or a symbol, which have none.
     *
     * @example
     * expr('x + 2y').args() // ['x', ['InvisibleOperator', 2, 'y']]
     */
    args: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property args`)
      return json.slice(1) as MathInput[]
    },
    /**
     * Carries out the operations still pending, such as `diff` or `integrate`,
     * and gives the result as a new expression.
     * Operations are otherwise only described,
     * and carried out when the expression is displayed or compared:
     * `apply` is for what needs the result itself, such as `hasSymbol`.
     *
     * @example
     * const derivative = await expr('x^3').diff().apply() // 3x^2
     */
    apply: async () => {
      const local = evaluateLocally()
      if (local) return expression(local.latex)
      const { latex, json: result } = await symapi.expr.apply({ expr: json })
      // The LaTeX stays the input, as tex displays it; the MathJSON spares parsing it again.
      return expression(result === null ? latex : { rawInput: latex, json: result })
    },
    /**
     * Whether `root` is a root:
     * whether the expression is 0 when `x`, or the variable given, is replaced by it.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('x^2 - 4').checkRoot(2) // true
     * await expr('t^2 - 4').checkRoot(3, 't') // false
     */
    checkRoot: (root: MathInput, x = 'x') =>
      node(json)
        .subs({ [x]: root })
        .isEqual(0),
    /**
     * The coefficients of a polynomial in `x`, or the variable given, as expressions,
     * that of degree 0 first: the coefficient of `x^n` is at index `n`.
     * It rejects an expression that is not a polynomial in that variable.
     * SymAPI decides, hence the promise.
     *
     * @example
     * const [c, b, a] = await expr('2x^2 - 3x + 1').coefficients() // 1, -3, 2
     * // The discriminant:
     * b.multiply(b).subtract(a.multiply(c).multiply(4))
     */
    coefficients: async (x = 'x') =>
      (await symapi.expr.coefficients({ expr: json, x })).map((c) =>
        expression({ json: c as MathJsonExpression }),
      ),
    /**
     * The real roots shared with `other`, as LaTeX strings.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('x^2 - 1').commonRoots('x^2 + x') // ['-1']
     */
    commonRoots: (other: MathInput) =>
      symapi.expr.commonRoots({ expr1: json, expr2: jsonOf(other) }),
    /**
     * The complex conjugate, as a new expression.
     * It is displayed as written: compare it to use it.
     *
     * @example
     * await expr('3 + 2i').conj().isEqual('3 - 2i') // true
     */
    conj: () => node(['Conjugate', json]),
    /**
     * How many times a symbol appears in the expression, as it is written.
     *
     * @example
     * expr('x^2 + 3x').count('x') // 2
     */
    count: (symbol: string) => {
      function _count(json: MathJsonExpression): number {
        if (json === symbol) return 1
        if (!Array.isArray(json)) return 0
        const [_func, ...args] = json
        return args.reduce((sum, arg) => sum + _count(arg), 0)
      }
      return _count(json)
    },
    /**
     * The degree of a polynomial in `x`, or the variable given, and `-Infinity` for 0.
     * It rejects an expression that is not a polynomial in that variable.
     *
     * @example
     * await expr('3x^4 - x').degree() // 4
     * await expr('x^2 y').degree('y') // 1
     */
    degree: (x = 'x') =>
      symapi.expr.degree({ expr: json, x }).then((d) => (d === null ? -Infinity : d)),
    /**
     * The change of the expression between two values of a variable, simplified:
     * `f(b) - f(a)`, as when computing an integral from an antiderivative.
     *
     * @example
     * expr('x^2').delta('x', 1, 3) // 8
     */
    delta: (x: string, a: MathInput, b: MathInput) => {
      const f = (t: MathInput) => node(json).subs({ [x]: t }).json
      return node(['Subtract', f(b), f(a)]).simplify()
    },
    /**
     * The denominator, as written, as a new expression: 1 if the expression is not a fraction.
     * Simplify first, with `simplify().apply()`, for that of the reduced fraction.
     *
     * @example
     * expr('\\frac{6}{8}').denominator() // 8
     * (await expr('\\frac{6}{8}').simplify().apply()).denominator() // 4
     */
    denominator: () => node(fractionParts(json)[1]),
    /**
     * The derivative with respect to `x`, or the variable given, as a new expression;
     * with `at`, its value at that point.
     * It is computed when displayed or compared, or with `apply`.
     *
     * @example
     * expr('x^3').diff() // 3x^2
     * expr('t^2').diff('t') // 2t
     * expr('x^3').diff('x', 2) // 12
     */
    diff: (x = 'x', at?: MathInput) => {
      const derivative: MathJsonExpression = ['Derivative', json, x]
      if (at === undefined) return node(derivative)
      return node(['Subs', derivative, x, jsonOf(at)])
    },
    /**
     * The real numbers where the expression is defined, in `x` or the variable given, as a set:
     * compare it with the set's `isEqual`.
     * SymAPI decides, hence the promise.
     *
     * @example
     * const domain = await expr('\\frac{1}{x - 1}').domain()
     * await domain.isEqual('\\mathbb{R} \\setminus \\{1\\}') // true
     * await domain.isEqual(']-\\infty, 1[ \\cup ]1, +\\infty[') // true
     */
    domain: async (x = 'x') =>
      set({ json: (await symapi.expr.domain({ expr: json, x })) as MathJsonExpression }),
    /**
     * The expression's LaTeX, encrypted,
     * for an answer that must not be readable in the page's source:
     * see `Encrypted` and `decrypt`.
     */
    encrypt: async () => Promise.resolve(node(json).latex()).then(encrypt),
    /**
     * The expanded form, as a new expression.
     *
     * @example
     * expr('(x + 1)^2').expand() // x^2 + 2x + 1
     */
    expand: () => node(['Expand', json]),
    /**
     * The expression evaluated by Compute Engine, in the browser, without asking SymAPI:
     * a Compute Engine expression, for what the operations here don't cover.
     * For a number, `N` is simpler.
     */
    evaluate: () => ce.expr(floorMod(json)).evaluate(),
    /**
     * Whether the expression is greater than or equal to `other`, for every value of its symbols:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('\\pi').geq(3) // true
     */
    geq: compare('geq'),
    /**
     * Whether the expression is greater than `other`, for every value of its symbols:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('\\pi').gt(3) // true
     * await expr('x').gt(0) // undefined
     */
    gt: compare('gt'),
    /**
     * Whether a number is written with `n` significant figures, as in physics:
     * `0.0450` and `1.20 \\times 10^{3}` have 3, and `1200` has 2,
     * whose final zeros don't count without a decimal point.
     * Only a number written in decimal or scientific notation has significant figures.
     *
     * @example
     * expr('0.0450').hasSignificantFigures(3) // true
     */
    hasSignificantFigures: (n: number) =>
      written !== undefined && significantFigures(written) === n,
    /**
     * Whether the expression contains a symbol, such as `x` or `C`,
     * as it is written: call `apply` first for an operation still pending.
     * Constants such as π, e and i are not symbols.
     *
     * @example
     * expr('2\\pi').hasSymbol() // false
     * expr('x^2 + C').hasSymbol() // true
     * expr('2 + 3').hasSymbol() // false
     * // Whether an antiderivative has its constant:
     * (await attempt.subtract(expected).simplify().apply()).hasSymbol()
     */
    hasSymbol: () => ce.expr(json, { form: 'raw' }).unknowns.length > 0,
    /**
     * The factored form, as a new expression.
     *
     * @example
     * expr('x^2 - 5x + 6').factor() // (x - 3)(x - 2)
     */
    factor: () => node(['Factor', json]),
    /**
     * The name of the outermost operation, in MathJSON, such as `'Add'`, `'Multiply'` or `'Power'`.
     * It throws for a number or a symbol.
     *
     * @example
     * expr('x + 1').func() // 'Add'
     */
    func: () => {
      if (!Array.isArray(json)) throw new Error(`Only arrays have the property func`)
      return json[0] as string
    },
    /**
     * The imaginary part of a complex number, as a new expression.
     * It is displayed as written: compare it, or get its value with `N`.
     *
     * @example
     * expr('3 + 2i').imaginary().N() // 2
     */
    imaginary: () => node(['Imaginary', json]),
    /**
     * Whether the expression belongs to a set, written in LaTeX:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('3').in('\\mathbb{Z}') // true
     */
    in: (set: MathInput) => undecided(symapi.expr.inSet({ expr1: json, expr2: jsonOf(set) })),
    /**
     * An antiderivative with respect to `x`, or the variable given, as a new expression;
     * with bounds, the definite integral.
     * It is computed when displayed or compared, or with `apply`.
     *
     * @example
     * expr('x^2').integrate() // x^3/3
     * expr('x^2').integrate('x', 0, 1) // 1/3
     */
    integrate: (...params: v.InferInput<typeof integrateParams>) =>
      node(['Integrate', json, ...v.parse(integrateParams, params)]),
    /**
     * Whether the expression equals `other` mathematically, however each is written:
     * `(x - 2)(x - 3)` equals `(3 - x)(2 - x)` and `x^2 - 5x + 6`.
     * With `error`, whether two numbers differ by at most `error`.
     * `other` is LaTeX or an expression, or a promise of one.
     * SymAPI decides, hence the promise.
     * Equations are compared with `isEquivalent`.
     *
     * @example
     * await expr('(x - 2)(x - 3)').isEqual('x^2 - 5x + 6') // true
     * await expr('\\sqrt{2}').isEqual('1.414', 0.001) // true
     * // In a step, the usual correction:
     * grade: (ctx) => ctx.inputs.attempt.isEqual(ctx.data.expr.diff())
     */
    isEqual: async (other: MaybeAsync<MathInput>, error: number = 0) => {
      if (error > 0) {
        const applied = async (e: {
          json: MathJsonExpression
          apply: () => Promise<{ json: MathJsonExpression }>
        }) => (hasInstructionOp(e.json) ? (await e.apply()).json : e.json)
        const [a, b] = await Promise.all([applied(node(json)), applied(expression(await other))])
        return node(['Subtract', a, b]).abs().N() <= error
      }
      return await symapi.expr.equal({ expr1: json, expr2: jsonOf(await other) })
    },
    /**
     * Whether a complex number is written as `a + bi`, with `a` and `b` real.
     * A number that Compute Engine knows to be real counts too, such as `2e^{i\\pi}`, which is `-2`.
     *
     * @example
     * expr('3 + 2i').isComplexRectangular() // true
     * expr('2e^{i}').isComplexRectangular() // false
     */
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
    /**
     * Whether a complex number is written as `re^{iθ}`, with `r` nonnegative and `θ` real,
     * `i` written first in the exponent.
     *
     * @example
     * expr('2e^{i 2}').isComplexExponential() // true
     * expr('2e^{2i}').isComplexExponential() // false
     * expr('3 + 2i').isComplexExponential() // false
     */
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
    /**
     * Whether a complex number is written as `r(\\cos θ + i \\sin θ)`,
     * with `r` nonnegative and the same real `θ` twice, as it is written.
     *
     * @example
     * expr('2(\\cos 1 + i \\sin 1)').isComplexPolar() // true
     */
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
    /**
     * Whether two equations have the same solutions,
     * as one is a nonzero multiple of the other:
     * `2x = 4` and `x = 2`.
     * Both must be equations;
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('2x = 4').isEquivalent('x = 2') // true
     */
    isEquivalent: async (other: MaybeAsync<MathInput>) =>
      symapi.expr.equivalent({ expr1: json, expr2: jsonOf(await other) }),
    /**
     * Whether the expression is exact, written without a decimal number:
     * for "donnez la valeur exacte".
     * A repeating decimal, such as `0.\\overline{3}`, is exact.
     *
     * @example
     * expr('\\frac{\\sqrt{2}}{2}').isExact() // true
     * expr('0.707').isExact() // false
     */
    isExact: () => (written !== undefined ? !hasDecimal(written) : !hasDecimalNumber(json)),
    /**
     * Whether the expression is written in expanded form:
     * a sum of terms none of which expands further.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('x^2 + 2x + 1').isExpanded() // true
     * await expr('(x + 1)^2').isExpanded() // false
     */
    isExpanded: () => symapi.expr.isExpanded({ expr: json }),
    /**
     * Whether the expression is a decimal number that rounds `value` to `decimals` decimals:
     * it is within half a unit of the last decimal of `value`,
     * and written with at most that many decimals.
     * Rounding 2.675 to 2.67 or to 2.68 both count, as either is a correct rounding.
     *
     * @example
     * await expr('3.14').isRoundingOf('\\pi', 2) // true
     * await expr('3.1416').isRoundingOf('\\pi', 2) // false: too many decimals
     * await expr('3.15').isRoundingOf('\\pi', 2) // false
     */
    isRoundingOf: async (value: MaybeAsync<MathInput>, decimals: number) => {
      const places = written === undefined ? undefined : writtenDecimals(written)
      if (places === undefined || places > decimals) return false
      const exact = expression(await value)
      const n = (hasInstructionOp(exact.json) ? await exact.apply() : exact).N()
      return Math.abs(node(json).N() - n) <= 0.5 * 10 ** -decimals * (1 + 1e-9)
    },
    /**
     * Whether the numbers of the expression are written in their simplest form:
     * fractions in lowest terms, with a positive denominator other than 1,
     * no fraction within a fraction, no root in a denominator,
     * and no square (or cube…) left to take out of a root of an integer.
     * It looks at numbers only: combine it with `isEqual`,
     * and with `isFactored` for algebraic fractions.
     *
     * @example
     * expr('\\frac{3}{4}').isSimplified() // true
     * expr('\\frac{6}{8}').isSimplified() // false
     * expr('\\sqrt{8}').isSimplified() // false: 2\\sqrt{2}
     * expr('\\frac{1}{\\sqrt{2}}').isSimplified() // false: \\frac{\\sqrt{2}}{2}
     */
    isSimplified: () => isSimplified(json),
    /**
     * Whether an equation is solved for `x`, or the variable given:
     * written `x = …`, or `… = x`, with no `x` on the other side.
     * Combine it with `isEquivalent` to grade the solution.
     *
     * @example
     * expr('x = 3').isSolvedFor() // true
     * expr('2x = 6').isSolvedFor() // false
     * // The correction of "résolvez":
     * grade: (ctx) => [ctx.inputs.attempt.isSolvedFor(), ctx.inputs.attempt.isEquivalent(ctx.data.equation)]
     */
    isSolvedFor: (x = 'x') => {
      if (!Array.isArray(json) || json[0] !== 'Equal' || json.length !== 3) return false
      const [, a, b] = json
      const free = (side: MathJsonExpression) => node(side).count(x) === 0
      return (a === x && free(b!)) || (b === x && free(a!))
    },
    /**
     * Whether the expression is a single symbol, such as `x`.
     *
     * @example
     * expr('x').isSymbol() // true
     * expr('2x').isSymbol() // false
     */
    isSymbol: () => typeof json === 'string',
    /**
     * Whether an equality or an inequality is true.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('2^{10} > 1000').isTrue() // true
     */
    isTrue: () => symapi.expr.isTrue({ expr: json }),
    /**
     * Whether the expression is written in factored form:
     * a product of factors none of which factors further, a numeric factor aside.
     * Combined with `isEqual`, it checks that an answer is the factored polynomial.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('(x - 2)(x - 3)').isFactored() // true
     * await expr('x^2 - 5x + 6').isFactored() // false
     * // The correction of Factor:
     * grade: (ctx) => [ctx.inputs.attempt.isEqual(ctx.data.expr), ctx.inputs.attempt.isFactored()]
     */
    isFactored: () => symapi.expr.isFactored({ expr: json }),
    /**
     * Whether a rational function is written as a sum of partial fractions.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('\\frac{1}{x - 1} + \\frac{2}{x + 1}').isPartialFractionDecomposition() // true
     */
    isPartialFractionDecomposition: () =>
      symapi.expr.isPartialFractionDecomposition({ expr: json }),
    /**
     * Whether a polynomial of degree 2 in `x`, or the variable given, is written in vertex form,
     * `a(x - h)^2 + k`: with `x` only once.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('2(x - 1)^2 + 3').isVertexForm() // true
     * await expr('2x^2 - 4x + 5').isVertexForm() // false
     */
    isVertexForm: async (x = 'x') => {
      if (node(json).count(x) !== 1) return false
      return (await symapi.expr.degree({ expr: json, x }).catch(() => null)) === 2
    },
    /**
     * The expression in LaTeX, as `tex` displays it.
     * Operations still pending are carried out first,
     * which may ask SymAPI: the LaTeX is then a promise.
     *
     * @example
     * await expr('x^3').diff().latex() // '3x^2'
     * // In a page, `tex` does this for you:
     * {tex`(x^3)' = ${expr('x^3').diff()}`}
     */
    latex: () => evaluateLocally()?.latex ?? symapi.expr.latex({ expr: json }),
    /**
     * Whether the expression is less than or equal to `other`, for every value of its symbols:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('3').leq('\\pi') // true
     */
    leq: compare('leq'),
    /**
     * The left side of an equation or an inequality, as a new expression.
     *
     * @example
     * expr('2x + 1 = 5').lhs() // 2x + 1
     */
    lhs: () => side(1),
    /**
     * The limit as `x` tends to `a`, as a new expression:
     * from both sides, or from the `'left'` or the `'right'` only.
     * `a` and the result may be infinite, written `\\infty`.
     * It is computed when displayed or compared, or with `apply`.
     *
     * @example
     * await expr('\\frac{\\sin x}{x}').limit('x', 0).isEqual(1) // true
     * await expr('\\frac{1}{x}').limit('x', 0, 'right').isEqual('\\infty') // true
     * await expr('\\frac{2x + 1}{x}').limit('x', '\\infty').isEqual(2) // true
     */
    limit: (x: string, a: MathInput, side?: 'left' | 'right') =>
      node([
        'Limit',
        json,
        x,
        jsonOf(a),
        ...(side === undefined ? [] : [side === 'left' ? 'Left' : 'Right']),
      ]),
    /**
     * Whether the expression is less than `other`, for every value of its symbols:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('3').lt('\\pi') // true
     */
    lt: compare('lt'),
    /**
     * Whether the expression has the form of a pattern, once both are expanded,
     * each symbol of the pattern standing for any polynomial, `x` included:
     * `x^3` matches `a x^2`, with `a = x`.
     * Use it to recognise a form loosely, and `isEqual` to grade.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('2x^2 + 3x + 1').matches('a x^2 + b x + c') // true
     * await expr('(x + 1)^2').matches('(x + a)^2') // true
     */
    matches: (other: MathInput) => symapi.expr.match({ expr1: json, expr2: jsonOf(other) }),
    /**
     * The remainder of the division by `other`, of the sign of `other` as Python's `%`, as a new expression.
     * It is displayed as written: compare it, or get its value with `N`.
     *
     * @example
     * expr('-7').mod(3).N() // 2
     */
    mod: (other: MathInput) => node(['Mod', json, jsonOf(other)]),
    /**
     * The product with `other`, as a new expression.
     *
     * @example
     * expr('x + 1').multiply('x') // (x + 1)x
     */
    multiply: (other: MathInput) => node(['Multiply', json, jsonOf(other)]),
    /**
     * The value as a JavaScript number, computed in the browser:
     * `NaN` for an expression that is not a real number, such as one with a symbol.
     * With `precision`, rounded to that many decimals.
     *
     * @example
     * expr('\\sqrt{2}').N() // 1.4142135623730951
     * expr('\\sqrt{2}').N(3) // 1.414
     */
    N: (precision?: number) => {
      // `Number(boxed)` silently returns 0 for anything that isn't a real
      // literal (symbols, complex numbers, ComplexInfinity, ...), so read
      // the real/imaginary parts explicitly and return NaN instead.
      const n = N(node(json).evaluate())
      const result = isNumber(n) && n.im === 0 ? n.re : NaN
      return precision === undefined ? result : round(result, precision)
    },
    /**
     * The numerator, as written, as a new expression: the expression itself if it is not a fraction.
     * Simplify first, with `simplify().apply()`, for that of the reduced fraction.
     *
     * @example
     * expr('\\frac{6}{8}').numerator() // 6
     */
    numerator: () => node(fractionParts(json)[0]),
    /**
     * The expression in Python, with NumPy for functions, as for `expect.matplotlib.plot`.
     * With `true`, operations still pending are carried out first, which may ask SymAPI: it is then a promise.
     *
     * @example
     * expr('\\sin(x) + x^2').python() // 'x ** 2 + np.sin(x)'
     * await expr('x^3').diff().python(true) // '3 * x ** 2'
     */
    python: toPython,
    /**
     * The real part of a complex number, as a new expression.
     * It is displayed as written: compare it, or get its value with `N`.
     *
     * @example
     * expr('3 + 2i').real().N() // 3
     */
    real: () => node(['Real', json]),
    /**
     * The right side of an equation or an inequality, as a new expression.
     *
     * @example
     * expr('2x + 1 = 5').rhs() // 5
     */
    rhs: () => side(2),
    /**
     * The roots, real by default and complex with `true`, as LaTeX strings.
     * It rejects an expression with infinitely many roots, such as `\\sin x`.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('x^2 - 4').roots() // ['-2', '2']
     * await expr('x^2 + 1').roots(true) // ['i', '- i']
     */
    roots: (complex = false) => symapi.expr.roots({ expr: json, complex }),
    /**
     * The simplified form, as a new expression.
     *
     * @example
     * expr('\\frac{x^2 - 1}{x - 1}').simplify() // x + 1
     */
    simplify: () => node(['Simplify', json]),
    /**
     * The expression with symbols replaced, each by LaTeX, a number or an expression.
     * Into a derivative or an integral still pending, the substitution waits for it:
     * the derivative of `x^2` at 3 is 6.
     *
     * @example
     * expr('x^2 + y').subs({ x: 2, y: 'a' }) // 2^2 + a, displayed as written
     * await expr('x^2 + y').subs({ x: 2, y: 'a' }).isEqual('4 + a') // true
     * expr('x^2').diff().subs({ x: 3 }) // 6
     */
    subs: (rawSubstitutions: Record<string, MathInput>) => {
      const substitutions = mapValues(
        v.parse(v.record(v.string(), MathInput), rawSubstitutions),
        (v) => v.json,
      )
      // Instructions such as Derivative/Integrate bind their variable:
      // substituting into them directly would turn d/dx x^2 into d/d3 3^2.
      // Defer the substitution to sympy with a Subs node instead.
      if (hasInstructionOp(json)) {
        const keys = Object.keys(substitutions)
        if (keys.length === 0) return node(json)
        const values = keys.map((k) => substitutions[k]!)
        return node(
          keys.length === 1
            ? ['Subs', json, keys[0]!, values[0]!]
            : ['Subs', json, ['Tuple', ...keys], ['Tuple', ...values]],
        )
      }
      return node(sanitize(ce.expr(json, { form: 'raw' }).subs(substitutions).json))
    },
    /**
     * The solutions of the equation in `x`, or the variable given, as a set:
     * real by default, complex with `true`.
     * The set's `isEqual` compares it with another.
     *
     * @example
     * await expr('x^2 = 4').solve().isEqual('\\{-2, 2\\}') // true
     */
    solve: (x: MathInput = 'x', complex = false) =>
      set(['Solve', json, jsonOf(x), complex ? 'ComplexNumbers' : 'RealNumbers']),
    /**
     * The difference with `other`, as a new expression.
     *
     * @example
     * expr('x^2').subtract('1') // x^2 - 1
     */
    subtract: (other: MathInput) => node(['Subtract', json, jsonOf(other)]),
    /**
     * The Taylor polynomial of order `n` around `a`, in the variable `x`, as a new expression.
     * Compare it with `isEqual`: it isn't displayed as a polynomial.
     *
     * @example
     * await expr('e^x').taylor('x', 0, 3).isEqual('1 + x + \\frac{x^2}{2} + \\frac{x^3}{6}') // true
     */
    taylor: (x: MathInput, a: MathInput, n: number) =>
      node(['Normal', ['Series', json, jsonOf(x), jsonOf(a), n]]),
    /**
     * The input LaTeX, or the MathJSON as text.
     */
    toString: () => (typeof saved === 'object' ? stringify(json) : String(saved)),
    /**
     * What is saved of the expression: its LaTeX when it was given as LaTeX.
     */
    toJSON: () => saved,
    /**
     * A quantity: the expression as a magnitude in `unit`, as `expr(…, unit)` does.
     *
     * @example
     * expr('3').unit('m').convert('cm') // 300 cm
     */
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
    v.tuple([v.literal('Quantity'), MathInput, Unit]),
    v.transform(([_, magnitude, unit]) => quantityJson(magnitude.json, unit)),
  ),
  v.pipe(
    v.tuple([MathInput, Unit]),
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
    v.tuple([v.literal('Quantity'), MathInput, Unit]),
    v.transform(([_, magnitude, unit]) => quantityJson(magnitude.json, unit)),
  ),
  v.pipe(
    v.tuple([MathInput, Unit]),
    v.transform(([magnitude, unit]) => quantityJson(magnitude.json, unit)),
  ),
  v.pipe(
    v.tuple([QuantityValue]),
    v.transform(([json]) => json),
  ),
])

/**
 * A physical quantity, a magnitude with a unit, as `expr(magnitude, unit)` makes.
 * Units are written as Compute Engine reads them, such as `'m'`, `'km/h'` or `'N'`.
 *
 * @example
 * const speed = expr('90', 'km/h')
 * speed.convert('m/s') // 25 m/s
 * await speed.isEqual(['25', 'm/s']) // true
 * await expr('9.81', 'm/s^2').isEqual(['10', 'm/s^2'], { tolerance: 0.5 }) // true
 */
/** The magnitude of a quantity as it was given, to read how it is written. */
function writtenMagnitude(raw: unknown[]): string | undefined {
  const [first, second] = raw
  if (Array.isArray(first) && first[0] === 'Quantity') return writtenMagnitude(first)
  const magnitude =
    first === 'Quantity'
      ? second
      : typeof first === 'object' && first !== null && 'magnitude' in first
        ? first.magnitude
        : first
  if (typeof magnitude === 'string' || typeof magnitude === 'number') return String(magnitude)
  if (typeof magnitude === 'object' && magnitude !== null && 'rawInput' in magnitude)
    return writtenMagnitude([magnitude.rawInput])
  return undefined
}

const SI_BASE_UNITS = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd']

/** The coherent SI unit of a dimension: a named one, such as N or J, or a product of base units. */
function siUnit(dimension: DimensionVector): MathJsonExpression {
  const named = findNamedUnit(dimension)
  if (named) return named
  const power = (unit: string, exponent: number): MathJsonExpression =>
    exponent === 1 ? unit : ['Power', unit, exponent]
  const product = (factors: MathJsonExpression[]): MathJsonExpression =>
    factors.length === 1 ? factors[0]! : ['Multiply', ...factors]
  const numerator = SI_BASE_UNITS.flatMap((unit, i) =>
    dimension[i]! > 0 ? [power(unit, dimension[i]!)] : [],
  )
  const denominator = SI_BASE_UNITS.flatMap((unit, i) =>
    dimension[i]! < 0 ? [power(unit, -dimension[i]!)] : [],
  )
  if (denominator.length === 0) return product(numerator)
  return ['Divide', numerator.length === 0 ? 1 : product(numerator), product(denominator)]
}

export function quantity(...rawQuantity: v.InferInput<typeof QuantityArgs>) {
  const result = v.safeParse(QuantityArgs, rawQuantity)
  if (!result.success)
    throw new Error(
      `Invalid quantity ${JSON.stringify(rawQuantity)}:\n${JSON.stringify(result.issues, null, 2)}`,
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

  /** Another quantity, or a number or an expression, which has no unit. */
  const operand = (other: QuantityLike | MathInput): MathJsonExpression => {
    const asQuantity = v.safeParse(QuantityValue, other)
    return asQuantity.success ? asQuantity.output : jsonOf(other as MathInput)
  }

  const asQuantityJson = (unitOrQuantity: Unit | QuantityLike): QuantityJson => {
    const asQuantity = v.safeParse(QuantityValue, unitOrQuantity)
    return asQuantity.success ? asQuantity.output : quantityJson(1, v.parse(Unit, unitOrQuantity))
  }

  return {
    /**
     * The quantity in another unit, measuring the same thing.
     *
     * @example
     * expr('90', 'km/h').convert('m/s') // 25 m/s
     */
    convert: (unit: Unit) => apply('UnitConvert', json, v.parse(Unit, unit)),
    /**
     * The magnitude, as an expression, in the quantity's unit.
     */
    magnitude: node(json[1]),
    /**
     * The sum with another quantity, in a unit that measures the same thing:
     * the result is in the unit of the first.
     *
     * @example
     * expr('1', 'km').add(['200', 'm']) // 1.2 km
     */
    add: (other: QuantityLike) => apply('Add', json, v.parse(QuantityValue, other)),
    /**
     * The difference with another quantity, in compatible units.
     */
    subtract: (other: QuantityLike) => apply('Subtract', json, v.parse(QuantityValue, other)),
    /**
     * The product with another quantity, or with a number, whose units multiply.
     *
     * @example
     * expr('3', 'm').multiply(['2', 's']) // 6 m s
     * expr('3', 'm').multiply(2) // 6 m
     */
    multiply: (other: QuantityLike | MathInput) => apply('Multiply', json, operand(other)),
    /**
     * The quotient by another quantity, or by a number, whose units divide:
     * a distance divided by a time is a speed.
     * Quantities that measure the same thing have no unit left:
     * compare their magnitudes in one unit instead.
     *
     * @example
     * expr('100', 'km').divide(['2', 'h']) // 50 km/h
     */
    divide: (other: QuantityLike | MathInput) => apply('Divide', json, operand(other)),
    /**
     * The quantity raised to a power, its unit too.
     *
     * @example
     * expr('3', 'm').pow(2) // 9 m^2
     */
    pow: (exponent: MathInput) => apply('Power', json, jsonOf(exponent)),
    /**
     * Whether the quantity measures the same thing as a unit or another quantity:
     * a speed for `'km/h'`, whatever its own unit.
     * Use it to tell a wrong unit from a wrong value in feedback.
     *
     * @example
     * expr('25', 'm/s').measuresSameAs('km/h') // true
     * expr('25', 'm').measuresSameAs('km/h') // false
     */
    measuresSameAs: (unitOrQuantity: Unit | QuantityLike) =>
      compatible(asQuantityJson(unitOrQuantity)),
    /**
     * Whether the quantity is in that unit, or one equal to it:
     * for "donnez la réponse en km", which `isEqual` doesn't check.
     *
     * @example
     * expr('1.2', 'km').isInUnit('km') // true
     * expr('1200', 'm').isInUnit('km') // false
     * expr('3', 'J').isInUnit('kg*m^2/s^2') // true
     */
    isInUnit: (unit: Unit) => {
      const target = v.parse(Unit, unit)
      if (!compatible(quantityJson(1, target))) return false
      const factor = quantity(1, json[2] as Unit)
        .convert(target as Unit)
        .magnitude.N()
      return Math.abs(factor - 1) < 1e-9
    },
    /**
     * Whether the magnitude is written with `n` significant figures, as in physics:
     * `0.0450` and `1.20 \\times 10^{3}` have 3, and `1200` has 2,
     * whose final zeros don't count without a decimal point.
     *
     * @example
     * expr('9.81', 'm/s^2').hasSignificantFigures(3) // true
     */
    hasSignificantFigures: (n: number) => {
      const written = writtenMagnitude(rawQuantity)
      return written !== undefined && significantFigures(written) === n
    },
    /**
     * The quantity in coherent SI units:
     * a named unit when there is one, such as N or J, and base units otherwise.
     *
     * @example
     * expr('90', 'km/h').toSI() // 25 m/s
     * expr('2', 'kN').toSI() // 2000 N
     */
    toSI: () => {
      const dimension = getExpressionDimension(json[2] as string)
      if (!dimension) throw new Error(`Cannot tell the dimension of ${stringify(json[2])}`)
      return apply('UnitConvert', json, siUnit(dimension))
    },
    unit: json[2],
    json,
    /**
     * Whether the quantity equals another, in any unit that measures the same thing:
     * false when the units measure different things,
     * undefined when Compute Engine cannot tell (e.g. symbolic magnitudes).
     * The tolerance is in the unit of `other` unless it has its own,
     * or relative to `other`, as a percentage such as `'2%'`.
     *
     * @example
     * await expr('9.81', 'm/s^2').isEqual(['10', 'm/s^2'], { tolerance: 0.5 }) // true
     * await expr('98', 'cm').isEqual(['1', 'm'], { tolerance: '5%' }) // true
     */
    isEqual: async (
      rawOther: QuantityLike,
      options: { tolerance?: number | `${number}%` | QuantityLike } = {},
    ): Promise<boolean | undefined> => {
      const other = v.parse(QuantityValue, rawOther)
      if (!compatible(other)) return false
      const relative = (percentage: string) =>
        quantity(
          (Math.abs(node(other[1]).N()) * Number(percentage.slice(0, -1))) / 100,
          other[2] as Unit,
        )
      const tolerance =
        options.tolerance === undefined || typeof options.tolerance === 'number'
          ? quantity(options.tolerance ?? 0, other[2])
          : typeof options.tolerance === 'string' && options.tolerance.endsWith('%')
            ? relative(options.tolerance)
            : quantity(options.tolerance as QuantityLike)
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
    /**
     * The quantity in LaTeX, magnitude and unit.
     */
    latex: () => ce.expr(json, { form: 'raw' }).latex,
    /**
     * The quantity with a numeric magnitude, rounded to `precision` decimals if given.
     */
    N: (precision?: number) => quantity(node(json[1]).N(precision), json[2]),
    rawInput: rawQuantity,
    toJSON: () => rawQuantity,
  }
}

/**
 * A set, written in LaTeX, as `expr(…, 'set')` makes, with the operations of sets.
 *
 * @example
 * const solutions = expr('\\{-2, 2\\}', 'set')
 * await solutions.isEqual('\\{2, -2\\}') // true
 * await expr('\\{1\\}', 'set').isSubset('\\{1, 2\\}') // true
 */
/**
 * The MathJSON of a set: LaTeX is first read as French intervals,
 * as `[0, 10]` is otherwise a list.
 */
function setJsonOf(input: MathInput) {
  const intervals = typeof input === 'string' ? frenchIntervals(input, parseValid) : undefined
  return intervals ?? jsonOf(input)
}

export function set(input: MathInput) {
  const json = setJsonOf(input)
  return {
    json,
    /**
     * The set in LaTeX, intervals in French notation, `]1, +\\infty[`.
     */
    latex: () => setLatex(json),
    /**
     * The intersection with another set, as a new set.
     */
    intersect: (other: MathInput) => set(['Intersect', json, setJsonOf(other)]),
    /**
     * Whether the set is included in another.
     * SymAPI decides, hence the promise.
     */
    isSubset: async (other: MathInput) =>
      symapi.expr.subset({ expr1: json, expr2: setJsonOf(other) }),
    /**
     * Whether the set has the same elements as another, in any order.
     * SymAPI decides, hence the promise.
     */
    isEqual: async (other: MathInput) =>
      symapi.expr.setEqual({ expr1: json, expr2: setJsonOf(other) }),
  }
}

/** Intervals in French notation, which Compute Engine would write in English, `(1, \\infty)`. */
async function setLatex(json: MathJsonExpression): Promise<string> {
  if (!Array.isArray(json)) return expression({ json }).latex()
  const [head, ...args] = json as [string, ...MathJsonExpression[]]
  if (head === 'Interval') {
    const bound = async (b: MathJsonExpression, infinite: string) => {
      const open = Array.isArray(b) && b[0] === 'Open'
      const value = open ? (b as [string, MathJsonExpression])[1] : b
      const latex = await expression({ json: value }).latex()
      return {
        open: open || latex.includes('\\infty'),
        latex: latex === '\\infty' ? infinite : latex,
      }
    }
    const [a, b] = await Promise.all([bound(args[0]!, '+\\infty'), bound(args[1]!, '+\\infty')])
    return `${a.open ? ']' : '['}${a.latex} ; ${b.latex}${b.open ? '[' : ']'}`
  }
  if (head === 'Union') return (await Promise.all(args.map(setLatex))).join(' \\cup ')
  if (head === 'SetMinus') {
    const [a, b] = await Promise.all(args.map(setLatex))
    return `${a} \\setminus ${b}`
  }
  return expression({ json }).latex()
}

const isVector = (value: unknown): value is { components: ReturnType<typeof expression>[] } =>
  typeof value === 'object' && value !== null && 'components' in value && 'cross' in value

/** A vector, or the list of its components. */
const VectorValue = v.union([
  v.pipe(
    v.custom<{ components: ReturnType<typeof expression>[] }>(isVector),
    v.transform(({ components }) => components.map(({ rawInput, json }) => ({ rawInput, json }))),
  ),
  v.array(MathInput),
])
export type VectorLike = v.InferInput<typeof VectorValue>

// Results are kept in canonical form, which folds numbers (0 × 1 - 1 × 0 = 0)
// but leaves symbolic terms as written.
const canonical = (json: MathJsonExpression) => ce.expr(json).json

/**
 * A vector, from the list of its components, as `expr([…], 'vector')` makes.
 * Components are LaTeX, numbers or expressions;
 * results are vectors or expressions in turn.
 *
 * @example
 * const u = expr(['1', '2', '0'], 'vector')
 * const v = expr(['0', '1', 'a'], 'vector')
 * u.add(v) // (1, 3, a)
 * await u.dot(v).isEqual(2) // true, displayed 0a + 2
 * u.cross(v) // (2a, -a, 1)
 * u.norm() // √5
 * await u.scale(2).isEqual(['2', '4', '0']) // true
 */
export function vector(rawInput: VectorLike) {
  const components = v.parse(VectorValue, rawInput)
  const self = () => vector(rawInput)
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

  return {
    /**
     * The components, as expressions.
     */
    components: components.map((c) => expression(c)),
    json: ['List', ...components.map((c) => c.json)] as MathJsonExpression,
    rawInput,
    toJSON: () => rawInput,
    /**
     * The number of components.
     */
    dimension: components.length,
    /**
     * The sum with another vector of the same dimension.
     */
    add: (other: VectorLike) => componentwise(other, 'Add'),
    /**
     * The difference with another vector of the same dimension.
     */
    subtract: (other: VectorLike) => componentwise(other, 'Subtract'),
    /**
     * The vector multiplied by a number or an expression.
     */
    scale: (factor: MathInput) => {
      const k = jsonOf(factor)
      return fromJson(components.map((c) => ['Multiply', k, c.json]))
    },
    /**
     * The cross product with another vector, both of dimension 3.
     */
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
    /**
     * The dot product with another vector of the same dimension, as an expression.
     */
    dot: (rawOther: VectorLike) => {
      const other = sameDimension(rawOther, 'dot product')
      return expression({
        json: canonical([
          'Add',
          ...components.map((c, i) => ['Multiply', c.json, other[i]!.json] as const),
        ]),
      })
    },
    /**
     * The determinant of the vector and the others given, one fewer than the dimension:
     * 0 when they are linearly dependent; in 2D, the signed area of their parallelogram.
     *
     * @example
     * expr(['1', '2'], 'vector').det(['3', '4']) // -2
     * expr(['1', '0', '0'], 'vector').det(['0', '1', '0'], ['0', '0', '1']) // 1
     */
    det: (...rawOthers: VectorLike[]) => {
      const others = rawOthers.map((other) => sameDimension(other, 'determinant'))
      if (others.length !== components.length - 1)
        throw new Error(
          `A determinant takes ${components.length - 1} more vectors of dimension ${components.length}`,
        )
      const rows = [components, ...others].map((row) => row.map((c) => c.json))
      return expression({ json: canonical(determinant(rows)) })
    },
    /**
     * Whether each component equals the other vector's, as `isEqual` of expressions,
     * within `error` if given.
     */
    isEqual: async (rawOther: VectorLike, error = 0) => {
      const other = v.parse(VectorValue, rawOther)
      if (components.length !== other.length) return false
      const results = await mapAsync(range(components.length), async (i) =>
        expression(components[i]!).isEqual(other[i]!, error),
      )
      return results.every(Boolean)
    },
    /**
     * Whether the vector is parallel to another, its multiple: colinéaires.
     * The zero vector is parallel to every vector.
     *
     * @example
     * await expr(['1', '2'], 'vector').isParallel(['-2', '-4']) // true
     */
    isParallel: async (rawOther: VectorLike) => {
      const other = sameDimension(rawOther, 'parallelism')
      const minors = range(components.length).flatMap((i) =>
        range(i + 1, components.length).map((j) =>
          node([
            'Subtract',
            ['Multiply', components[i]!.json, other[j]!.json],
            ['Multiply', components[j]!.json, other[i]!.json],
          ]),
        ),
      )
      return (await Promise.all(minors.map((minor) => minor.isEqual(0)))).every(Boolean)
    },
    /**
     * Whether the vector is orthogonal to another: their dot product is 0.
     *
     * @example
     * await expr(['1', '2'], 'vector').isOrthogonal(['-2', '1']) // true
     */
    isOrthogonal: (rawOther: VectorLike) => self().dot(rawOther).isEqual(0),
    /**
     * Whether the vector has norm 1.
     */
    isUnit: () => self().norm().isEqual(1),
    /**
     * The angle with another vector, in radians, between 0 and π, as an expression.
     * It is displayed as written: compare it, or get its value with `N`.
     *
     * @example
     * await expr(['1', '0'], 'vector').angle(['1', '1']).isEqual('\\frac{\\pi}{4}') // true
     */
    angle: (rawOther: VectorLike) => {
      const other = vector(rawOther)
      const cos: MathJsonExpression = [
        'Divide',
        self().dot(other).json,
        ['Multiply', self().norm().json, other.norm().json],
      ]
      return node(['Arccos', cos])
    },
    /**
     * The unit vector in the same direction.
     */
    normalize: () => {
      const norm = self().norm().json
      return fromJson(components.map((c) => ['Divide', c.json, norm]))
    },
    /**
     * The orthogonal projection onto another vector.
     *
     * @example
     * expr(['2', '3'], 'vector').projection(['1', '0']) // (2, 0)
     */
    projection: (rawOnto: VectorLike) => {
      const onto = vector(rawOnto)
      const k = ['Divide', self().dot(onto).json, onto.dot(onto).json] as MathJsonExpression
      return onto.scale({ json: k })
    },
    /**
     * The components as JavaScript numbers, rounded to `precision` decimals if given.
     */
    N: (precision?: number) => components.map((c) => expression(c).N(precision)),
    latex: async () => {
      const c = await mapAsync(components, (component) =>
        Promise.resolve(expression(component).latex()),
      )
      return `\\begin{bmatrix}${c.join('\\\\')}\\end{bmatrix}`
    },
    /**
     * The norm, as an expression.
     */
    norm: () =>
      expression({
        json: canonical(['Sqrt', ['Add', ...components.map((c) => ['Power', c.json, 2] as const)]]),
      }),
    /**
     * The vector with each component simplified.
     */
    simplify: () => vector(components.map((c) => ({ json: ['Simplify', c.json] }))),
  }
}

/**
 * The vector from point `a` to point `b`, each given by its coordinates.
 *
 * @example
 * vector.fromPoints(['1', '2'], ['4', '6']) // (3, 4)
 */
vector.fromPoints = (a: VectorLike, b: VectorLike) => vector(b).subtract(a)

/** The determinant of a square matrix, by expansion along its first row. */
function determinant(rows: MathJsonExpression[][]): MathJsonExpression {
  if (rows.length === 1) return rows[0]![0]!
  const terms = rows[0]!.map((entry, j): MathJsonExpression => {
    const minor = rows.slice(1).map((row) => row.filter((_, k) => k !== j))
    const term: MathJsonExpression = ['Multiply', entry, determinant(minor)]
    return j % 2 === 0 ? term : ['Negate', term]
  })
  return ['Add', ...terms]
}

export type Quantity = ReturnType<typeof quantity>

/**
 * Nothing, for nothing: `expr(undefined)` is `undefined`, for optional data.
 */
export function expr(input: undefined, type?: undefined): undefined
/**
 * A mathematical expression, from LaTeX, to compute with and to compare answers.
 * The result offers the operations of computer algebra,
 * which are either **transformations**, giving a new expression
 * (`expand`, `factor`, `simplify`, `diff`, `integrate`, `subs`…),
 * or **questions**, answered by a promise
 * (`isEqual`, `isFactored`, `isExpanded`, `checkRoot`…).
 * Transformations chain in the order one would say them,
 * and are carried out when the expression is displayed or compared:
 * `tex` shows the result, and `await` gets an answer.
 * Hover each operation for its description and an example.
 *
 * @example
 * const f = expr('x^2 - 5x + 6')
 * f.factor() // (x - 3)(x - 2)
 * expr('x^3').diff().subs({ x: 2 }) // 12
 * await f.isEqual('(x - 2)(x - 3)') // true
 * // In a page: the solution is computed, not written
 * {tex`f'(x) = ${f.diff()}`}
 * // In a step: the correction in one line
 * grade: (ctx) => ctx.inputs.attempt.isEqual(ctx.data.f.diff())
 */
export function expr(input: MathInput, type?: undefined): Expression<'output'>
/**
 * A set, written in LaTeX: see `set`.
 *
 * @example
 * await expr('\\{-2, 2\\}', 'set').isEqual(expr('x^2 = 4').solve()) // true
 */
export function expr(input: MathInput, type: 'set'): ReturnType<typeof set>
/**
 * A vector, from the list of its components: see `vector`.
 *
 * @example
 * expr(['1', '2', '0'], 'vector').cross(['0', '1', '0']) // (0, 0, 1)
 */
export function expr(input: VectorLike, type: 'vector'): ReturnType<typeof vector>
/**
 * A physical quantity: the expression as a magnitude in the unit given, see `quantity`.
 *
 * @example
 * expr('90', 'km/h').convert('m/s') // 25 m/s
 */
export function expr(input: MathInput, type: string): Quantity
export function expr(input?: MathInput | VectorLike, type?: string) {
  if (input === undefined) return undefined
  if (type === undefined) return expression(input as MathInput)
  if (type === 'vector') return vector(input as VectorLike)
  if (type === 'set') return set(input as MathInput)
  return quantity(input as MathInput, type)
}
