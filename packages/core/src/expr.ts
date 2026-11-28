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
    abs: () => expression({ json: ['Abs', json] }),
    /**
     * The argument of a complex number, in radians, as a new expression.
     * It is displayed as written, `arg(i)`: compare it to get its value.
     *
     * @example
     * await expr('i').arg().isEqual('\\frac{\\pi}{2}') // true
     */
    arg: () => expression({ json: ['Argument', json] }),
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
      return json.slice(1) as Math[]
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
    apply: async () => expr(await expression({ json }).latex()),
    /**
     * Whether `root` is a root:
     * whether the expression is 0 when `x`, or the variable given, is replaced by it.
     * SymAPI decides, hence the promise.
     *
     * @example
     * await expr('x^2 - 4').checkRoot(2) // true
     * await expr('t^2 - 4').checkRoot(3, 't') // false
     */
    checkRoot: (root: Math, x = 'x') =>
      expression({ json })
        .subs({ [x]: root })
        .isEqual(0),
    /**
     * The complex conjugate, as a new expression.
     * It is displayed as written: compare it to use it.
     *
     * @example
     * await expr('3 + 2i').conj().isEqual('3 - 2i') // true
     */
    conj: () => expression({ json: ['Conjugate', json] }),
    /**
     * How many times a symbol appears in the expression, as it is written.
     *
     * @example
     * expr('x^2 + 3x').count('x') // 2
     */
    count: (symol: string) => {
      function _count(json: MathJsonExpression): number {
        if (json === symol) return 1
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
    delta: (x: string, a: Math, b: Math) => {
      const f = (t: Math) => expression({ json }).subs({ [x]: t }).json
      return expression({ json: ['Subtract', f(b), f(a)] }).simplify()
    },
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
    diff: (x = 'x', at?: Math) => {
      const derivative: MathJsonExpression = ['Derivative', json, x]
      if (at === undefined) return expression({ json: derivative })
      return expression({ json: ['Subs', derivative, x, v.parse(Math, at).json] })
    },
    /**
     * The expression's LaTeX, encrypted,
     * for an answer that must not be readable in the page's source:
     * see `Encrypted` and `decrypt`.
     */
    encrypt: async () => Promise.resolve(expression({ json }).latex()).then(encrypt),
    /**
     * The expanded form, as a new expression.
     *
     * @example
     * expr('(x + 1)^2').expand() // x^2 + 2x + 1
     */
    expand: () => expression({ json: ['Expand', json] }),
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
    geq: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'geq' }),
      ),
    /**
     * Whether the expression is greater than `other`, for every value of its symbols:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('\\pi').gt(3) // true
     * await expr('x').gt(0) // undefined
     */
    gt: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'gt' }),
      ),
    /**
     * Whether the expression contains a symbol, such as `x` or `C`,
     * as it is written: call `apply` first for an operation still pending.
     *
     * @example
     * expr('x^2 + C').hasSymbol() // true
     * expr('2 + 3').hasSymbol() // false
     * // Whether an antiderivative has its constant:
     * (await attempt.subtract(expected).simplify().apply()).hasSymbol()
     */
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
    /**
     * The factored form, as a new expression.
     *
     * @example
     * expr('x^2 - 5x + 6').factor() // (x - 3)(x - 2)
     */
    factor: () => expression({ json: ['Factor', json] }),
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
    imaginary: () => expression({ json: ['Imaginary', json] }),
    /**
     * Whether the expression belongs to a set, written in LaTeX:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('3').in('\\mathbb{Z}') // true
     */
    in: (set: Math) =>
      undecided(symapi.expr.inSet({ expr1: json, expr2: v.parse(Math, set).json })),
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
      expression({ json: ['Integrate', json, ...v.parse(integrateParams, params)] }),
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
    isEquivalent: async (other: MaybeAsync<Math>) =>
      symapi.expr.equivalent({ expr1: json, expr2: v.parse(Math, await other).json }),
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
     * The expression in LaTeX, as `tex` displays it.
     * Operations still pending are carried out first,
     * which may ask SymAPI: the LaTeX is then a promise.
     *
     * @example
     * await expr('x^3').diff().latex() // '3x^2'
     * // In a page, `tex` does this for you:
     * {tex`(x^3)' = ${expr('x^3').diff()}`}
     */
    latex: () => {
      try {
        const evaluated = ce.expr(json, { form: 'raw' }).evaluate()
        if (hasInstructionOp(evaluated.json)) return symapi.expr.latex({ expr: json })
        return evaluated.latex
      } catch {
        return symapi.expr.latex({ expr: json })
      }
    },
    /**
     * Whether the expression is less than or equal to `other`, for every value of its symbols:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('3').leq('\\pi') // true
     */
    leq: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'leq' }),
      ),
    /**
     * Whether the expression is less than `other`, for every value of its symbols:
     * `true`, `false`, or `undefined` when SymAPI can't decide.
     *
     * @example
     * await expr('3').lt('\\pi') // true
     */
    lt: (other: Math) =>
      undecided(
        symapi.expr.compare({ expr1: json, expr2: v.parse(Math, other).json, comparison: 'lt' }),
      ),
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
    matches: (other: Math) => symapi.expr.match({ expr1: json, expr2: v.parse(Math, other).json }),
    /**
     * The remainder of the division by `other`, of the sign of `other` as Python's `%`, as a new expression.
     * It is displayed as written: compare it, or get its value with `N`.
     *
     * @example
     * expr('-7').mod(3).N() // 2
     */
    mod: (other: Math) => expression({ json: ['Mod', json, v.parse(Math, other).json] }),
    /**
     * The product with `other`, as a new expression.
     *
     * @example
     * expr('x + 1').multiply('x') // (x + 1)x
     */
    multiply: (other: Math) => expression({ json: ['Multiply', json, v.parse(Math, other).json] }),
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
      const n = N(expression({ json }).evaluate())
      const result = isNumber(n) && n.im === 0 ? n.re : NaN
      return precision === undefined ? result : round(result, precision)
    },
    /**
     * The expression in Python, with NumPy for functions, as for `expect.matplotlib.plot`.
     * With `true`, operations still pending are carried out first, which may ask SymAPI: it is then a promise.
     *
     * @example
     * expr('\\sin(x) + x^2').python() // 'x ** 2 + np.sin(x)'
     * await expr('x^3').diff().python(true) // '3 * x ** 2'
     */
    python: <T extends boolean = false>(sympy?: T): T extends false ? string : Promise<string> => {
      if (!sympy) return python.compile(ce.expr(json)).code as any
      else
        return expr({ json })
          .apply()
          .then((e) => e.python(false)) as any
    },
    /**
     * The real part of a complex number, as a new expression.
     * It is displayed as written: compare it, or get its value with `N`.
     *
     * @example
     * expr('3 + 2i').real().N() // 3
     */
    real: () => expression({ json: ['Real', json] }),
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
    simplify: () => expression({ json: ['Simplify', json] }),
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
    /**
     * The solutions of the equation in `x`, or the variable given, as a set:
     * real by default, complex with `true`.
     * The set's `isEqual` compares it with another.
     *
     * @example
     * await expr('x^2 = 4').solve().isEqual('\\{-2, 2\\}') // true
     */
    solve: (x: Math = 'x', complex = false) =>
      set(['Solve', json, v.parse(Math, x).json, complex ? 'ComplexNumbers' : 'RealNumbers']),
    /**
     * The difference with `other`, as a new expression.
     *
     * @example
     * expr('x^2').subtract('1') // x^2 - 1
     */
    subtract: (other: Math) => expression({ json: ['Subtract', json, v.parse(Math, other).json] }),
    /**
     * The Taylor polynomial of order `n` around `a`, in the variable `x`, as a new expression.
     * Compare it with `isEqual`: it isn't displayed as a polynomial.
     *
     * @example
     * await expr('e^x').taylor('x', 0, 3).isEqual('1 + x + \\frac{x^2}{2} + \\frac{x^3}{6}') // true
     */
    taylor: (x: Math, a: Math, n: number) =>
      expression({
        json: ['Normal', ['Series', json, v.parse(Math, x).json, v.parse(Math, a).json, n]],
      }),
    /**
     * The input LaTeX, or the MathJSON as text.
     */
    toString: () => (typeof input === 'string' ? input : stringify(json)),
    /**
     * What is saved of the expression: its LaTeX when it was given as LaTeX.
     */
    toJSON: () => (typeof input === 'string' ? input : { json }),
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
    magnitude: expression({ json: json[1] }),
    /**
     * The difference with another quantity, in compatible units.
     */
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
    /**
     * The quantity in LaTeX, magnitude and unit.
     */
    latex: () => ce.expr(json, { form: 'raw' }).latex,
    /**
     * The quantity with a numeric magnitude, rounded to `precision` decimals if given.
     */
    N: (precision?: number) => quantity(expression({ json: json[1] }).N(precision), json[2]),
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
export function set(input: Math) {
  const json = v.parse(Math, input).json
  return {
    json,
    /**
     * The intersection with another set, as a new set.
     */
    intersect: (other: Math) => set(['Intersect', json, v.parse(Math, other).json]),
    /**
     * Whether the set is included in another.
     * SymAPI decides, hence the promise.
     */
    isSubset: async (other: Math) =>
      symapi.expr.subset({ expr1: json, expr2: v.parse(Math, other).json }),
    /**
     * Whether the set has the same elements as another, in any order.
     * SymAPI decides, hence the promise.
     */
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
    scale: (factor: Math) => {
      const k = v.parse(Math, factor).json
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
     * Whether each component equals the other vector's, as `isEqual` of expressions.
     */
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
export function expr(input: Math, type?: undefined): Expression<'output'>
/**
 * A set, written in LaTeX: see `set`.
 *
 * @example
 * await expr('\\{-2, 2\\}', 'set').isEqual(expr('x^2 = 4').solve()) // true
 */
export function expr(input: Math, type: 'set'): ReturnType<typeof set>
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
export function expr(input: Math, type: string): Quantity
export function expr(input?: Math | VectorLike, type?: string) {
  if (input === undefined) return undefined
  if (type === undefined) return expression(input as Math)
  if (type === 'vector') return vector(input as VectorLike)
  if (type === 'set') return set(input as Math)
  return quantity(input as Math, type)
}
