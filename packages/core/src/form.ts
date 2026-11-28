import type { MathJsonExpression } from '@cortex-js/compute-engine'

/**
 * How expressions are written, rather than what they are worth:
 * the checks `expr` makes on a student's answer when the form counts.
 */

const isInteger = (json: MathJsonExpression): json is number =>
  typeof json === 'number' && Number.isInteger(json)

const isFraction = (
  json: MathJsonExpression,
): json is [string, MathJsonExpression, MathJsonExpression] =>
  Array.isArray(json) && (json[0] === 'Divide' || json[0] === 'Rational') && json.length === 3

const contains = (json: MathJsonExpression, test: (json: MathJsonExpression) => boolean): boolean =>
  test(json) ||
  (Array.isArray(json) &&
    (json.slice(1) as MathJsonExpression[]).some((arg) => contains(arg, test)))

const isRoot = (json: MathJsonExpression) =>
  Array.isArray(json) && (json[0] === 'Sqrt' || json[0] === 'Root')

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/**
 * The integer that visibly divides the expression as written:
 * 6 for `6x`, 2 for `2x + 4`, 1 when there is none.
 */
function integerFactor(json: MathJsonExpression): number {
  if (isInteger(json)) return Math.abs(json)
  if (!Array.isArray(json)) return 1
  const [head, ...args] = json as [string, ...MathJsonExpression[]]
  if (head === 'Negate') return integerFactor(args[0]!)
  if (head === 'Multiply' || head === 'InvisibleOperator')
    return args.filter(isInteger).reduce<number>((product, n) => product * Math.abs(n), 1)
  if (head === 'Add' || head === 'Subtract') return args.map(integerFactor).reduce(gcd)
  return 1
}

/** Whether a positive integer is divisible by the k-th power of an integer greater than 1. */
function hasPowerFactor(n: number, k: number) {
  for (let d = 2; d ** k <= n; d++) if (n % d ** k === 0) return true
  return false
}

/**
 * Whether the numbers of an expression are in their simplest form, as written:
 * fractions in lowest terms, with a positive denominator other than 1,
 * no fraction or decimal within a fraction, no root in a denominator,
 * and roots of integers with no square (or cube…) left to take out.
 */
export function isSimplified(json: MathJsonExpression): boolean {
  if (!Array.isArray(json)) return true
  const [head, ...args] = json as [string, ...MathJsonExpression[]]
  if (isFraction(json)) {
    const [a, b] = args as [MathJsonExpression, MathJsonExpression]
    if (contains(a, isFraction) || contains(b, isFraction)) return false
    if ([a, b].some((n) => typeof n === 'number' && !Number.isInteger(n))) return false
    if (contains(b, isRoot)) return false
    if (typeof b === 'number' && (b === 1 || b < 0)) return false
    if (Array.isArray(b) && b[0] === 'Negate') return false
    if (gcd(integerFactor(a), integerFactor(b)) > 1) return false
  }
  if (head === 'Sqrt' && isInteger(args[0]!) && (args[0] <= 1 || hasPowerFactor(args[0], 2)))
    return false
  if (head === 'Root' && isInteger(args[0]!) && isInteger(args[1]!)) {
    const [n, k] = args as [number, number]
    if (n <= 1 || hasPowerFactor(n, k)) return false
  }
  return args.every(isSimplified)
}

/** The numerator and the denominator as written: the expression and 1 if it is not a fraction. */
export function fractionParts(json: MathJsonExpression): [MathJsonExpression, MathJsonExpression] {
  if (isFraction(json)) return [json[1], json[2]]
  if (Array.isArray(json) && json[0] === 'Negate' && isFraction(json[1]!))
    return [['Negate', json[1][1]], json[1][2]]
  return [json, 1]
}

/** A decimal number, `3,14`, `3{,}14` or `3.14`, written with a point. */
const decimalPoint = (latex: string) =>
  latex
    .replace(/\s+/g, '')
    .replace(/\{,\}/g, '.')
    .replace(/(\d),(\d)/g, '$1.$2')

/** Whether LaTeX has a decimal number, a repeating decimal such as `0.\overline{3}` aside. */
export function hasDecimal(latex: string) {
  return /\d\.\d/.test(decimalPoint(latex).replace(/\d*\.\d*\\overline\{\d+\}/g, ''))
}

/** Whether MathJSON has a number that is not an integer. */
export function hasDecimalNumber(json: MathJsonExpression): boolean {
  if (typeof json === 'number') return !Number.isInteger(json)
  if (typeof json === 'object' && json !== null && 'num' in json) return /[.e]/i.test(json.num)
  return Array.isArray(json) && (json.slice(1) as MathJsonExpression[]).some(hasDecimalNumber)
}

/**
 * The digits of a number written in decimal or scientific notation,
 * `-0.050` or `1.20 \times 10^{3}`, without sign nor power of 10,
 * and whether it had a power of 10; `undefined` for anything else.
 */
function writtenDigits(latex: string) {
  const match = decimalPoint(latex)
    .replace(/^[-+]/, '')
    .match(/^(\d*\.?\d*)((?:\\times|\\cdot|\*)10\^(?:\{[-+]?\d+\}|\d))?$/)
  if (!match || !/\d/.test(match[1]!)) return undefined
  return { digits: match[1]!, scientific: match[2] !== undefined }
}

/** How many decimals a number is written with: 2 for `3.10`, `undefined` if it is not a decimal number. */
export function writtenDecimals(latex: string) {
  const written = writtenDigits(latex)
  if (!written || written.scientific) return undefined
  return written.digits.split('.')[1]?.length ?? 0
}

/**
 * How many significant figures a number is written with:
 * 3 for `0.0450`, `1.20 \times 10^{3}` and `1.20`, 2 for `1200`,
 * whose final zeros are not significant without a decimal point.
 */
export function significantFigures(latex: string) {
  const written = writtenDigits(latex)
  if (!written) return undefined
  const { digits } = written
  const significant = digits.replace('.', '').replace(/^0+/, '')
  if (significant === '') return Math.max(1, digits.split('.')[1]?.length ?? 0)
  return digits.includes('.') ? significant.length : significant.replace(/0+$/, '').length
}

/** Splits LaTeX at a separator outside braces, parentheses and brackets. */
function splitTopLevel(latex: string, separator: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < latex.length; i++) {
    const c = latex[i]!
    if ('{(['.includes(c)) depth++
    else if ('})]'.includes(c)) depth--
    else if (depth === 0 && latex.startsWith(separator, i)) {
      parts.push(latex.slice(start, i))
      start = i + separator.length
    }
  }
  return [...parts, latex.slice(start)]
}

/**
 * MathJSON of intervals in French notation, which Compute Engine doesn't read:
 * `]2, 5]` is open at 2, `[1 ; 3[` at 3, and `\cup` joins them.
 * `undefined` when the LaTeX is not that.
 */
export function frenchIntervals(
  latex: string,
  parse: (latex: string) => MathJsonExpression | undefined,
): MathJsonExpression | undefined {
  const normalized = latex
    .replace(/\\(left|right)\s*/g, '')
    .replace(/\\lbrack/g, '[')
    .replace(/\\rbrack/g, ']')
    .trim()
  const intervals = normalized.split('\\cup').map((part): MathJsonExpression | undefined => {
    const text = part.trim()
    const [left, right] = [text[0], text.at(-1)]
    if (!left || !right || !'[]'.includes(left) || !'[]'.includes(right)) return undefined
    const inner = text.slice(1, -1)
    // `;` separates the bounds when the comma may be a decimal comma.
    const semicolon = inner.includes(';')
    const bounds = splitTopLevel(inner, semicolon ? ';' : ',')
    if (bounds.length !== 2) return undefined
    const [a, b] = bounds.map((bound) =>
      parse((semicolon ? bound.replace(/(\d),(\d)/g, '$1.$2') : bound).trim()),
    )
    if (a === undefined || b === undefined) return undefined
    return ['Interval', left === ']' ? ['Open', a] : a, right === '[' ? ['Open', b] : b]
  })
  if (intervals.some((interval) => interval === undefined)) return undefined
  return intervals.length === 1 ? intervals[0] : ['Union', ...(intervals as MathJsonExpression[])]
}
