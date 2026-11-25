import { describe, expect, test } from 'bun:test'

import { decrypt } from './crypto'
import { expr } from './expr'
import { takeSymapiRequests } from './symapi.replay'

type Test<T = any> = {
  desc: string
  promise: () => Promise<T> | T
  result: T
}

function define<T extends Test>(test: T) {
  return test
}

describe('expression', () => {
  test.each<Test>([
    define({
      desc: 'abs: |-5| != -5',
      promise: () => expr(-5).abs().isEqual(-5),
      result: false,
    }),
    define({
      desc: 'abs: |1 + i| = sqrt(2)',
      promise: () => expr('1 + i').abs().isEqual('\\sqrt{2}'),
      result: true,
    }),
    define({
      desc: 'abs: |i| = 1',
      promise: () => expr('i').abs().isEqual(1),
      result: true,
    }),
    define({
      desc: 'apply: evaluates instructions (expand)',
      promise: () =>
        expr('(x + 1)^2')
          .expand()
          .apply()
          .then((e) => e.isExpanded()),
      result: true,
    }),
    define({
      desc: 'arg: arg(1 + i) = pi/4',
      promise: () => expr('1 + i').arg().isEqual('\\frac{\\pi}{4}'),
      result: true,
    }),
    define({
      desc: 'args: xy',
      promise: () => expr('xy').args(),
      result: ['x', 'y'],
    }),
    define({
      desc: 'checkRoot: 0 is not a root of 1/x',
      promise: () => expr('\\frac{1}{x}').checkRoot(0),
      result: false,
    }),
    define({
      desc: 'checkRoot: 0 is not a root of x^2 + 1',
      promise: () => expr('x^2 + 1').checkRoot(0),
      result: false,
    }),
    define({
      desc: 'checkRoot: 2 is a root of x^2 - 5x + 6',
      promise: () => expr('x^2 - 5x + 6').checkRoot(2),
      result: true,
    }),
    define({
      desc: 'checkRoot: i is a root of x^2 + 1',
      promise: () => expr('x^2 + 1').checkRoot('i'),
      result: true,
    }),
    define({
      desc: 'checkRoot: in another variable',
      promise: () => expr('y - 3').checkRoot(3, 'y'),
      result: true,
    }),
    define({
      desc: "checkRoot: works on derivatives (2 is a root of (x^2 - 4x)')",
      promise: () => expr('x^2 - 4x').diff().checkRoot(2),
      result: true,
    }),
    define({
      desc: 'conj: conj(1 + i) = 1 - i',
      promise: () => expr('1 + i').conj().isEqual('1 - i'),
      result: true,
    }),
    define({
      desc: 'count: counts nested occurrences',
      promise: () => expr('\\frac{\\sin x}{x}').count('x'),
      result: 2,
    }),
    define({
      desc: 'count: e must be counted by its sanitized name',
      promise: () => [expr('e^x').count('e'), expr('e^x').count('ExponentialE')],
      result: [0, 1],
    }),
    define({
      desc: 'count: x appears twice in x^2 + x + 1',
      promise: () => expr('x^2 + x + 1').count('x'),
      result: 2,
    }),
    define({
      desc: 'count: y does not appear in x^2',
      promise: () => expr('x^2').count('y'),
      result: 0,
    }),
    define({
      desc: 'degree: 0 has degree -Infinity',
      promise: () => expr(0).degree(),
      result: -Infinity,
    }),
    define({
      desc: 'degree: a constant has degree 0',
      promise: () => expr(5).degree(),
      result: 0,
    }),
    define({
      desc: 'degree: in another variable',
      promise: () => expr('x^2 y^3').degree('y'),
      result: 3,
    }),
    define({
      desc: 'degree: in x by default',
      promise: () => expr('x^2 y^3').degree(),
      result: 2,
    }),
    define({
      desc: 'degree: of an unexpanded polynomial',
      promise: () => expr('(x + 1)^2').degree(),
      result: 2,
    }),
    define({
      desc: 'degree: x^2 - x^2 has degree -Infinity',
      promise: () => expr('x^2 - x^2').degree(),
      result: -Infinity,
    }),
    define({
      desc: 'degree: x^3 + x has degree 3',
      promise: () => expr('x^3 + x').degree(),
      result: 3,
    }),
    define({
      desc: 'delta: [x^2]_1^3 = 8',
      promise: () => expr('x^2').delta('x', 1, 3).isEqual(8),
      result: true,
    }),
    define({
      desc: 'delta: equal bounds give 0',
      promise: () => expr('x^2').delta('x', 2, 2).isEqual(0),
      result: true,
    }),
    define({
      desc: "diff: (x^2)' at x = 3 is 6",
      promise: () => expr('x^2').diff('x', 3).isEqual(6),
      result: true,
    }),
    define({
      desc: 'diff: at a json point',
      promise: () => expr('x^3').diff('x', ['Add', 1, 1]).isEqual(12),
      result: true,
    }),
    define({
      desc: 'diff: d/dt t^3 = 3t^2',
      promise: () => expr('t^3').diff('t').isEqual('3t^2'),
      result: true,
    }),
    define({
      desc: 'diff: of a constant is 0',
      promise: () => expr(5).diff().isEqual(0),
      result: true,
    }),
    define({
      desc: 'diff: twice',
      promise: () => expr('x^3').diff().diff().isEqual('6x'),
      result: true,
    }),
    define({
      desc: 'diff: with respect to an absent variable is 0',
      promise: () => expr('x^2').diff('y').isEqual(0),
      result: true,
    }),
    define({
      desc: 'encrypt: decrypts back to the latex',
      promise: () => expr('x + 1').encrypt().then(decrypt),
      result: 'x+1',
    }),
    define({
      desc: 'evaluate: 2 + 3 = 5',
      promise: () => expr('2 + 3').evaluate().json,
      result: 5,
    }),
    define({
      desc: 'expand: (x + 1)^2 = x^2 + 2x + 1',
      promise: () => expr('(x + 1)^2').expand().latex(),
      result: 'x^{2} + 2 x + 1',
    }),
    define({
      desc: 'expr(undefined) is undefined',
      promise: () => expr(undefined),
      result: undefined,
    }),
    define({
      desc: 'factor: factor(x^2 - 1) is factored',
      promise: () => expr('(x - 1)(x + 1)').isFactored(),
      result: true,
    }),
    define({
      desc: 'func: xy',
      promise: () => expr('xy').func(),
      result: 'InvisibleOperator',
    }),
    define({
      desc: 'functions: arcsin',
      promise: () => expr('\\arcsin 1').isEqual('\\frac{\\pi}{2}'),
      result: true,
    }),
    define({
      desc: 'functions: factorial',
      promise: () => expr('5!').isEqual(120),
      result: true,
    }),
    define({
      desc: 'functions: hyperbolic',
      promise: () => expr('\\cosh^2 x - \\sinh^2 x').isEqual(1),
      result: true,
    }),
    define({
      desc: 'functions: ln is natural',
      promise: () => expr('\\ln e').isEqual(1),
      result: true,
    }),
    define({
      desc: 'functions: log is base 10',
      promise: () => expr('\\log 100').isEqual(2),
      result: true,
    }),
    define({
      desc: 'functions: log_2',
      promise: () => expr('\\log_2 8').isEqual(3),
      result: true,
    }),
    define({
      desc: 'functions: nth root',
      promise: () => expr('\\sqrt[3]{8}').isEqual(2),
      result: true,
    }),
    define({
      desc: 'functions: sec',
      promise: () => expr('\\sec x').isEqual('\\frac{1}{\\cos x}'),
      result: true,
    }),
    define({
      desc: 'geq: 3 >= 3',
      promise: () => expr(3).geq(3),
      result: true,
    }),
    define({
      desc: 'geq: x^2 >= 0',
      promise: () => expr('x^2').geq(0),
      result: true,
    }),
    define({
      desc: 'gt: 3 > 3 is false',
      promise: () => expr(3).gt(3),
      result: false,
    }),
    define({
      desc: 'gt: e^x > 0',
      promise: () => expr('e^x').gt(0),
      result: true,
    }),
    define({
      desc: 'gt: x > 0 is undecidable',
      promise: () => expr('x').gt(0),
      result: undefined,
    }),
    define({
      desc: 'hasSymbol: 2 + 3 has no symbol',
      promise: () => expr('2 + 3').hasSymbol(),
      result: false,
    }),
    define({
      desc: 'hasSymbol: x + 1 has a symbol',
      promise: () => expr('x + 1').hasSymbol(),
      result: true,
    }),
    define({
      desc: 'imaginary: Im(3 + 4i) = 4',
      promise: () => expr('3 + 4i').imaginary().isEqual(4),
      result: true,
    }),
    define({
      desc: 'in: -2 is not in N',
      promise: () => expr(-2).in('\\N'),
      result: false,
    }),
    define({
      desc: 'in: 1/2 is in [0, 1]',
      promise: () => expr('\\frac{1}{2}').in(['Interval', 0, 1]),
      result: true,
    }),
    define({
      desc: 'in: 1/2 is not in Z',
      promise: () => expr('\\frac{1}{2}').in('\\Z'),
      result: false,
    }),
    define({
      desc: 'in: 2 is in N',
      promise: () => expr(2).in('\\N'),
      result: true,
    }),
    define({
      desc: 'in: 3 is not in {1, 2}',
      promise: () => expr(3).in('\\{1, 2\\}'),
      result: false,
    }),
    define({
      desc: 'in: closed bound is included in [0, 1)',
      promise: () => expr(0).in('[0, 1)'),
      result: true,
    }),
    define({
      desc: 'in: i is not in R',
      promise: () => expr('i').in('\\R'),
      result: false,
    }),
    define({
      desc: 'in: open bound is excluded from ]0, 1[',
      promise: () => expr(1).in(']0, 1['),
      result: false,
    }),
    define({
      desc: 'in: pi is not in Q',
      promise: () => expr('\\pi').in('\\Q'),
      result: false,
    }),
    define({
      desc: 'in: x in Q is undecidable',
      promise: () => expr('x').in('\\Q'),
      result: undefined,
    }),
    define({
      desc: 'in: x is in R (variables are real)',
      promise: () => expr('x').in('\\R'),
      result: true,
    }),
    define({
      desc: 'integrate: empty interval is 0',
      promise: () => expr('x').integrate('x', 0, 0).isEqual(0),
      result: true,
    }),
    define({
      desc: 'integrate: int_1^e 1/x dx = 1',
      promise: () => expr('\\frac{1}{x}').integrate('x', 1, 'e').isEqual(1),
      result: true,
    }),
    define({
      desc: 'integrate: reversed bounds flip the sign',
      promise: () => expr('x').integrate('x', 1, 0).isEqual('-\\frac{1}{2}'),
      result: true,
    }),
    define({
      desc: 'isComplexExponential: 1 + i is not',
      promise: () => expr('1 + i').isComplexExponential(),
      result: false,
    }),
    define({
      desc: 'isComplexExponential: 2 e^{i pi / 3}',
      promise: () => expr('2 e^{i \\frac{\\pi}{3}}').isComplexExponential(),
      result: true,
    }),
    define({
      desc: 'isComplexExponential: e^{-i pi / 4}',
      promise: () => expr('e^{-i \\frac{\\pi}{4}}').isComplexExponential(),
      result: true,
    }),
    define({
      desc: 'isComplexExponential: e^{i pi / 4}',
      promise: () => expr('e^{i \\frac{\\pi}{4}}').isComplexExponential(),
      result: true,
    }),
    define({
      desc: 'isComplexPolar: 2 (cos(pi/3) + i sin(pi/3))',
      promise: () =>
        expr(
          '2 \\left(\\cos\\left(\\frac{\\pi}{3}\\right) + i \\sin\\left(\\frac{\\pi}{3}\\right)\\right)',
        ).isComplexPolar(),
      result: true,
    }),
    define({
      desc: 'isComplexPolar: cos 1 + i sin 1',
      promise: () => expr('\\cos 1 + i \\sin 1').isComplexPolar(),
      result: true,
    }),
    define({
      desc: 'isComplexPolar: cos 1 + i sin 2 is not',
      promise: () => expr('\\cos 1 + i \\sin 2').isComplexPolar(),
      result: false,
    }),
    define({
      desc: 'isComplexRectangular: (1 + i)^2 is not',
      promise: () => expr('(1 + i)^2').isComplexRectangular(),
      result: false,
    }),
    define({
      desc: 'isComplexRectangular: -i',
      promise: () => expr('-i').isComplexRectangular(),
      result: true,
    }),
    define({
      desc: 'isComplexRectangular: 1 + 2i',
      promise: () => expr('1 + 2i').isComplexRectangular(),
      result: true,
    }),
    define({
      desc: 'isComplexRectangular: 3',
      promise: () => expr(3).isComplexRectangular(),
      result: true,
    }),
    define({
      desc: 'isEqual with error: applies sympy instructions first',
      promise: () => expr('x^2').diff('x', 3).isEqual(6, 0.01),
      result: true,
    }),
    define({
      desc: 'isEqual with error: bound is inclusive',
      promise: () => expr(1).isEqual(1.5, 0.5),
      result: true,
    }),
    define({
      desc: 'isEqual with error: complex numbers use the modulus',
      promise: () => expr('i').isEqual('2i', 0.1),
      result: false,
    }),
    define({
      desc: 'isEqual with error: different symbols are not equal',
      promise: () => expr('x').isEqual('y', 0.1),
      result: false,
    }),
    define({
      desc: 'isEqual with error: pi does not equal 3.1 ± 0.01',
      promise: () => expr('\\pi').isEqual(3.1, 0.01),
      result: false,
    }),
    define({
      desc: 'isEqual with error: pi equals 3.14 ± 0.01',
      promise: () => expr('\\pi').isEqual(3.14, 0.01),
      result: true,
    }),
    define({
      desc: 'isEqual: (x - 2)(x - 3) = x^2 - 5x + 6',
      promise: () => expr('(x - 2)(x - 3)').isEqual('x^2 - 5x + 6'),
      result: true,
    }),
    define({
      desc: 'isEqual: 1 + i = sqrt(2) e^{i pi / 4}',
      promise: () => expr('1 + i').isEqual('\\sqrt{2} e^{i \\frac{\\pi}{4}}'),
      result: true,
    }),
    define({
      desc: 'isEqual: 1/3 != 0.333',
      promise: () => expr('\\frac{1}{3}').isEqual(0.333),
      result: false,
    }),
    define({
      desc: 'isEqual: accepts a promise',
      promise: () => expr('x + x').isEqual(Promise.resolve('2x')),
      result: true,
    }),
    define({
      desc: 'isEqual: cos x + i sin x = e^{i x}',
      promise: () => expr('\\cos x + i \\sin x').isEqual('e^{i x}'),
      result: true,
    }),
    define({
      desc: 'isEqual: decimals are exact (0.1 + 0.2 = 0.3)',
      promise: () => expr('0.1 + 0.2').isEqual('0.3'),
      result: true,
    }),
    define({
      desc: 'isEqual: diff((x - 2)(x - 3)) = 2x - 5',
      promise: () => expr('(x - 2)(x - 3)').diff().isEqual('2x - 5'),
      result: true,
    }),
    define({
      desc: 'isEqual: i^2 = -1',
      promise: () => expr('i^2').isEqual(-1),
      result: true,
    }),
    define({
      desc: 'isEqual: int x dx = x^2 / 2',
      promise: () => expr('x').integrate().isEqual('\\frac{x^2}{2}'),
      result: true,
    }),
    define({
      desc: 'isEqual: int_0^1 x dx = 1/2',
      promise: () => expr('x').integrate('x', 0, 1).isEqual('\\frac{1}{2}'),
      result: true,
    }),
    define({
      desc: 'isEqual: sin^2 x + cos^2 x = 1',
      promise: () => expr('\\sin^2{x} + \\cos^2{x}').isEqual('1'),
      result: true,
    }),
    define({
      desc: 'isEquivalent: x = 2 is equivalent to 2x = 4',
      promise: () => expr('x = 2').isEquivalent('2x = 4'),
      result: true,
    }),
    define({
      desc: 'isEquivalent: x = 2 is not equivalent to x = 3',
      promise: () => expr('x = 2').isEquivalent('x = 3'),
      result: false,
    }),
    define({
      desc: 'isExpanded: (x + 1)^2 is not expanded',
      promise: () => expr('(x + 1)^2').isExpanded(),
      result: false,
    }),
    define({
      desc: 'isExpanded: x^2 + 2x + 1 is expanded',
      promise: () => expr('x^2 + 2x + 1').isExpanded(),
      result: true,
    }),
    define({
      desc: 'isFactored: x^2 - 1 is not factored',
      promise: () => expr('x^2 - 1').isFactored(),
      result: false,
    }),
    define({
      desc: 'isSymbol: x + 1 is not a symbol',
      promise: () => expr('x + 1').isSymbol(),
      result: false,
    }),
    define({
      desc: 'isSymbol: x is a symbol',
      promise: () => expr('x').isSymbol(),
      result: true,
    }),
    define({
      desc: 'isTrue: 1 != 2',
      promise: () => expr('1 \\ne 2').isTrue(),
      result: true,
    }),
    define({
      desc: 'isTrue: 1 < 2',
      promise: () => expr('1 < 2').isTrue(),
      result: true,
    }),
    define({
      desc: 'isTrue: 2 + 2 = 4',
      promise: () => expr('2 + 2 = 4').isTrue(),
      result: true,
    }),
    define({
      desc: 'isTrue: 2 + 2 = 5 is false',
      promise: () => expr('2 + 2 = 5').isTrue(),
      result: false,
    }),
    define({
      desc: 'isTrue: 2 <= 1 is false',
      promise: () => expr('2 \\le 1').isTrue(),
      result: false,
    }),
    define({
      desc: 'isTrue: x = 2 is not always true',
      promise: () => expr('x = 2').isTrue(),
      result: false,
    }),
    define({
      desc: 'json: e and i are sanitized in json input',
      promise: () => expr(['Add', 'e', 'i']).json,
      result: ['Add', 'ExponentialE', 'ImaginaryUnit'],
    }),
    define({
      desc: 'json: e and i are sanitized in latex input',
      promise: () => expr('e^{i}').json,
      result: ['Power', 'ExponentialE', 'ImaginaryUnit'],
    }),
    define({
      desc: 'json: e is sanitized in { json } input',
      promise: () => expr({ json: 'e' }).json,
      result: 'ExponentialE',
    }),
    define({
      desc: 'json: negative numbers are parsed as Negate',
      promise: () => expr(-5).json,
      result: ['Negate', 5],
    }),
    define({
      desc: 'json: x^2',
      promise: () => expr('x^2').json,
      result: ['Power', 'x', 2],
    }),
    define({
      desc: "latex: (sin x)' = cos x",
      promise: () => expr('\\sin{x}').diff().latex(),
      result: String.raw`\cos{\left(x \right)}`,
    }),
    define({
      desc: 'latex: abs(simplify(x^2)) has no Simplify node',
      promise: () =>
        Promise.resolve(expr('x^2').simplify().abs().latex()).then(
          (latex) => !latex.includes('Simplify'),
        ),
      result: true,
    }),
    define({
      desc: 'latex: diff((x - 2)(x - 3)) = 2x - 5',
      promise: () => expr('(x-2)(x - 3)').diff().latex(),
      result: '2 x - 5',
    }),
    define({
      desc: 'latex: factor(x^2 - 5x + 6) = (x - 2)(x - 3)',
      promise: () => expr('x^2 - 5x + 6').factor().latex(),
      result: String.raw`\left(x - 3\right) \left(x - 2\right)`,
    }),
    define({
      desc: 'latex: simplify(x^2) = x^2',
      promise: () => expr('x^2').simplify().latex(),
      result: 'x^{2}',
    }),
    define({
      desc: 'leq: 2 <= 3',
      promise: () => expr(2).leq(3),
      result: true,
    }),
    define({
      desc: 'lt: 3 < 2 is false',
      promise: () => expr(3).lt(2),
      result: false,
    }),
    define({
      desc: 'lt: x^2 < 0 is false',
      promise: () => expr('x^2').lt(0),
      result: false,
    }),
    define({
      desc: 'mod: -7 mod 3 = 2 numerically',
      promise: () => expr(-7).mod(3).N(),
      result: 2,
    }),
    define({
      desc: 'mod: -7 mod 3 = 2 symbolically',
      promise: () => expr(-7).mod(3).isEqual(2),
      result: true,
    }),
    define({
      desc: 'mod: 7 mod -3 = -2',
      promise: () => expr(7).mod(-3).N(),
      result: -2,
    }),
    define({
      desc: 'mod: 7 mod 3 = 1',
      promise: () => expr(7).mod(3).N(),
      result: 1,
    }),
    define({
      desc: 'mod: 7.5 mod 2 = 1.5',
      promise: () => expr(7.5).mod(2).N(),
      result: 1.5,
    }),
    define({
      desc: 'mod: by 0 is NaN',
      promise: () => expr(7).mod(0).N(),
      result: NaN,
    }),
    define({
      desc: 'multiply: x * x = x^2',
      promise: () => expr('x').multiply('x').isEqual('x^2'),
      result: true,
    }),
    define({
      desc: 'N: 1/0 is NaN, not 0',
      promise: () => expr('\\frac{1}{0}').N(),
      result: NaN,
    }),
    define({
      desc: 'N: a complex number is NaN, not 0',
      promise: () => expr('\\sqrt{-1}').N(),
      result: NaN,
    }),
    define({
      desc: 'N: a free symbol is NaN, not 0',
      promise: () => expr('x').N(),
      result: NaN,
    }),
    define({
      desc: 'N: pi',
      promise: () => expr('\\pi').N(),
      result: Math.PI,
    }),
    define({
      desc: 'N: pi with 2 decimals',
      promise: () => expr('\\pi').N(2),
      result: 3.14,
    }),
    define({
      desc: 'N: precision 0 rounds to an integer',
      promise: () => expr('2.5').N(0),
      result: 3,
    }),
    define({
      desc: 'N: rounds half up',
      promise: () => expr('2.555').N(2),
      result: 2.56,
    }),
    define({
      desc: 'pattern: x^2 + 2x + 1 = (a + b)^2',
      promise: () => expr('x^2 + 2x + 1').matches('(a + b)^2'),
      result: true,
    }),
    define({
      desc: 'pattern: x^2 - 4 != (a + b)^2',
      promise: () => expr('x^2 - 4').matches('(a + b)^2'),
      result: false,
    }),
    define({
      desc: 'pattern: x^2 - 4 = (a + b) (a - b)',
      promise: () => expr('x^2 - 4').matches('(a + b) (a - b)'),
      result: true,
    }),
    define({
      desc: 'python: compiles locally',
      promise: () => expr('x^2').python(),
      result: 'x ** 2',
    }),
    define({
      desc: 'python: with sympy, applies instructions first',
      promise: () => expr('x').diff().python(true),
      result: '1',
    }),
    define({
      desc: 'rawInput: keeps the original input',
      promise: () => expr('x^2').rawInput,
      result: 'x^2',
    }),
    define({
      desc: 'real variables: conj(x) = x',
      promise: () => expr('x').conj().isEqual('x'),
      result: true,
    }),
    define({
      desc: 'real variables: ln(xy) != ln x + ln y (x, y may be negative)',
      promise: () => expr('\\ln(xy)').isEqual('\\ln x + \\ln y'),
      result: false,
    }),
    define({
      desc: 'real variables: sqrt(x^2) != x',
      promise: () => expr('\\sqrt{x^2}').isEqual('x'),
      result: false,
    }),
    define({
      desc: 'real variables: sqrt(x^2) = |x|',
      promise: () => expr('\\sqrt{x^2}').isEqual('|x|'),
      result: true,
    }),
    define({
      desc: 'real: Re(3 + 4i) = 3',
      promise: () => expr('3 + 4i').real().isEqual(3),
      result: true,
    }),
    define({
      desc: 'roots: (x - 1)^2',
      promise: () => expr('(x - 1)^2').roots(),
      result: ['1'],
    }),
    define({
      desc: 'roots: in another variable',
      promise: () => expr('y^2 - 1').roots(),
      result: ['-1', '1'],
    }),
    define({
      desc: 'roots: of an equation',
      promise: () => expr('x^2 = 4').roots(),
      result: ['-2', '2'],
    }),
    define({
      desc: 'roots: x^2 + 1 has no real roots',
      promise: () => expr('x^2 + 1').roots(),
      result: [],
    }),
    define({
      desc: 'roots: x^2 + 1 has two complex roots',
      promise: () => expr('x^2 + 1').roots(true),
      result: ['i', '- i'],
    }),
    define({
      desc: 'roots: x^2 - 1',
      promise: () => expr('x^2 - 1').roots(),
      result: ['-1', '1'],
    }),
    define({
      desc: 'roots: x^2 - 2',
      promise: () => expr('x^2 - 2').roots(),
      result: ['\\sqrt{2}', '- \\sqrt{2}'],
    }),
    define({
      desc: 'roots: x^3 + 1 has one real root',
      promise: () => expr('x^3 - 1').roots(),
      result: ['1'],
    }),
    define({
      desc: 'roots: x^3 + 1 has three complex roots',
      promise: () =>
        expr('x^3 - 1')
          .roots(true)
          .then((r) => r.length),
      result: 3,
    }),
    define({
      desc: 'solve: in another variable',
      promise: () => expr('y - 1').solve('y').isEqual('\\{1\\}'),
      result: true,
    }),
    define({
      desc: 'solve: real solutions are the same over C',
      promise: () => expr('x^2 - 4').solve('x', true).isEqual('\\{-2, 2\\}'),
      result: true,
    }),
    define({
      desc: 'solve: solves over the complex numbers on demand',
      promise: () => expr('x^2 + 1').solve('x', true).isEqual('\\{i, -i\\}'),
      result: true,
    }),
    define({
      desc: 'solve: solves over the reals by default',
      promise: () => expr('x^2 + 1').solve().isEqual('\\emptyset'),
      result: true,
    }),
    define({
      desc: 'solve: x^2 = 4 has solutions {-2, 2}',
      promise: () => expr('x^2 - 4').solve().isEqual('\\{-2, 2\\}'),
      result: true,
    }),
    define({
      desc: 'solve: x^3 = 1 has one real solution',
      promise: () => expr('x^3 - 1').solve().isEqual('\\{1\\}'),
      result: true,
    }),
    define({
      desc: 'subs: does not substitute the variable of a derivative',
      promise: () => expr('x^2').diff().subs({ x: 3 }).isEqual(6),
      result: true,
    }),
    define({
      desc: 'subs: into a definite integral keeps the bounds',
      promise: () => expr('x t').integrate('x', 0, 1).subs({ t: 2 }).isEqual(1),
      result: true,
    }),
    define({
      desc: 'subs: into a derivative renders the evaluated latex',
      promise: () => expr('x^2').diff().subs({ x: 3 }).latex(),
      result: '6',
    }),
    define({
      desc: 'subs: several variables into a derivative are simultaneous',
      promise: () => expr('x y^2').diff('x').subs({ x: 'y', y: 2 }).isEqual(4),
      result: true,
    }),
    define({
      desc: 'subs: substitutions are simultaneous',
      promise: () => expr('x - y').subs({ x: 'y', y: 'x' }).json,
      result: ['Subtract', 'y', 'x'],
    }),
    define({
      desc: 'subs: unknown variables are ignored',
      promise: () => expr('x^2').subs({ y: 2 }).json,
      result: ['Power', 'x', 2],
    }),
    define({
      desc: 'subs: x^2, x -> y',
      promise: () => expr('x^2').subs({ x: 'y' }).latex(),
      result: 'y^2',
    }),
    define({
      desc: 'subs: x^2, x -> y',
      promise: () => expr('x^2').subs({ x: 'y' }).latex(),
      result: 'y^2',
    }),
    define({
      desc: 'subtract: x^2 - x^2 = 0',
      promise: () => expr('x^2').subtract('x^2').isEqual(0),
      result: true,
    }),
    define({
      desc: 'taylor: e^x at 0 up to x^3',
      promise: () =>
        expr('e^x').taylor('x', 0, 3).isEqual('1 + x + \\frac{x^2}{2} + \\frac{x^3}{6}'),
      result: true,
    }),
    define({
      desc: 'taylor: ln x around 1',
      promise: () => expr('\\ln x').taylor('x', 1, 2).isEqual('(x - 1) - \\frac{(x - 1)^2}{2}'),
      result: true,
    }),
    define({
      desc: 'taylor: order 0 is the constant term',
      promise: () => expr('e^x').taylor('x', 0, 0).isEqual(1),
      result: true,
    }),
    define({
      desc: 'toJSON: json input is wrapped',
      promise: () => expr(['Power', 'x', 2]).toJSON(),
      result: { json: ['Power', 'x', 2] },
    }),
    define({
      desc: 'toJSON: string input is returned as is',
      promise: () => expr('x^2').toJSON(),
      result: 'x^2',
    }),
    define({
      desc: 'toString: json input is stringified',
      promise: () => expr(['Power', 'x', 2]).toString(),
      result: '["Power","x",2]',
    }),
    define({
      desc: 'toString: string input is returned as is',
      promise: () => expr('x^2').toString(),
      result: 'x^2',
    }),
    define({
      desc: 'unit: 3 with unit m is a quantity',
      promise: () => expr(3).unit('m').json,
      result: ['Quantity', '3', 'm'],
    }),
  ])('$desc', async ({ promise, result }) => {
    expect(await promise()).toEqual(result)
  })

  test.each<{ desc: string; promise: () => Promise<unknown>; error: string }>([
    {
      desc: 'degree: 1/x is not a polynomial',
      promise: () => expr('\\frac{1}{x}').degree(),
      error: 'not a polynomial',
    },
    {
      desc: 'degree: sin x is not a polynomial',
      promise: () => expr('\\sin x').degree(),
      error: 'not a polynomial',
    },
    {
      desc: 'degree: sqrt x is not a polynomial',
      promise: () => expr('\\sqrt{x}').degree(),
      error: 'not a polynomial',
    },
    {
      desc: 'in: the right-hand side must be a set',
      promise: () => expr(1).in('x'),
      error: 'is not a set',
    },
    {
      desc: 'isEqual: equations must use isEquivalent',
      promise: () => expr('x = 2').isEqual('2 = x'),
      error: 'use equivalent',
    },
    {
      desc: 'isEquivalent: expressions must be equations',
      promise: () => expr('x + x').isEquivalent('2x'),
      error: 'must be an equation',
    },
    {
      desc: 'roots: every real is a root of 0',
      promise: () => expr(0).roots(),
      error: 'Cannot list the roots',
    },
    {
      desc: 'roots: sin x has infinitely many roots',
      promise: () => expr('\\sin x').roots(),
      error: 'Cannot list the roots',
    },
    {
      desc: 'unsupported functions are reported by name',
      promise: () => expr(['Floor', 'x']).isEqual(1),
      error: "Unsupported MathJSON function: 'Floor'",
    },
  ])('$desc', async ({ promise, error }) => {
    await expect(promise()).rejects.toThrow(error)
  })

  test.each([
    ['args', 'a number', () => expr(3).args()],
    ['args', 'a symbol', () => expr('x').args()],
    ['func', 'a number', () => expr(3).func()],
    ['func', 'a symbol', () => expr('x').func()],
  ])('%s: throws on %s', (_, __, f) => {
    expect(f).toThrow()
  })

  test.each(['\\frac{1}', 'x+', '(x', '\\foo{x}'])('throws on unparsable LaTeX %p', (latex) => {
    expect(() => expr(latex)).toThrow(/Invalid LaTeX/)
  })
})

describe('quantity', () => {
  test.each<Test>([
    define({
      desc: 'convert: 1050 g = 1.05 kg',
      promise: () => expr(1050, 'g').convert('kg').magnitude.N(),
      result: 1.05,
    }),
    define({
      desc: 'convert: 36 km/h = 10 m/s',
      promise: () => expr(36, 'km/h').convert('m/s').magnitude.N(),
      result: 10,
    }),
    define({
      desc: 'convert: incompatible units throw',
      promise: () => {
        try {
          expr(1, 'kg').convert('m')
          return false
        } catch {
          return true
        }
      },
      result: true,
    }),
    define({
      desc: 'isEqual with error: 0.995kg equals 1kg ± 0.01kg',
      promise: () => expr(0.995, 'kg').isEqual([1, 'kg'], 0.01),
      result: true,
    }),
    define({
      desc: 'isEqual with error: 1.005kg equals 1kg ± 0.01kg',
      promise: () => expr(1.005, 'kg').isEqual([1, 'kg'], 0.01),
      result: true,
    }),
    define({
      desc: 'isEqual with error: 1.02kg does not equal 1kg ± 0.01kg',
      promise: () => expr(1.02, 'kg').isEqual([1, 'kg'], 0.01),
      result: false,
    }),
    define({
      desc: 'isEqual with error: 101400 Pa equals 101325 Pa ± 100 Pa',
      promise: () => expr(101400, 'Pa').isEqual([101325, 'Pa'], 100),
      result: true,
    }),
    define({
      desc: 'isEqual with error: 101600 Pa does not equal 101325 Pa ± 100 Pa',
      promise: () => expr(101600, 'Pa').isEqual([101325, 'Pa'], 100),
      result: false,
    }),
    define({
      desc: 'isEqual with error: 1050g equals 1kg ± 100g',
      promise: () => expr(1050, 'g').isEqual([1, 'kg'], 0.1),
      result: true,
    }),
    define({
      desc: 'isEqual with error: 1200g does not equal 1kg ± 100g',
      promise: () => expr(1200, 'g').isEqual([1, 'kg'], 0.1),
      result: false,
    }),
    define({
      desc: 'isEqual with error: 9.6 m/s² does not equal 9.8 m/s² ± 0.1 m/s²',
      promise: () => expr(9.6, 'm/s^2').isEqual([9.8, 'm/s^2'], 0.1),
      result: false,
    }),
    define({
      desc: 'isEqual with error: 9.75 m/s² equals 9.8 m/s² ± 0.1 m/s²',
      promise: () => expr(9.75, 'm/s^2').isEqual([9.8, 'm/s^2'], 0.1),
      result: true,
    }),
    define({
      desc: 'isEqual with error: 9.85 m/s² equals 9.8 m/s² ± 0.1 m/s²',
      promise: () => expr(9.85, 'm/s^2').isEqual([9.8, 'm/s^2'], 0.1),
      result: true,
    }),
    define({
      desc: 'isEqual: incompatible units are not equal',
      promise: () => expr(1, 'kg').isEqual([1, 'm'], 0.1),
      result: false,
    }),
    define({
      desc: 'isEqual: without error, 1000 g equals 1 kg',
      promise: () => expr(1000, 'g').isEqual(1, 'kg'),
      result: true,
    }),
    define({
      desc: 'json: 3 m',
      promise: () => expr(3, 'm').json,
      result: ['Quantity', '3', 'm'],
    }),
    define({
      desc: 'latex: 9.8 m/s^2',
      promise: () => expr(9.8, 'm/s^2').latex(),
      result: '9.8\\,\\mathrm{m/s^{2}}',
    }),
    define({
      desc: 'magnitude: 3 m has magnitude 3',
      promise: () => expr(3, 'm').magnitude.N(),
      result: 3,
    }),
    define({
      desc: 'N: rounds the magnitude',
      promise: () => expr('\\pi', 'm').N(2).magnitude.N(),
      result: 3.14,
    }),
    define({
      desc: 'rawInput / toJSON: keeps the original input',
      promise: () => [expr(3, 'm').rawInput, expr(3, 'm').toJSON()],
      result: [
        [3, 'm'],
        [3, 'm'],
      ],
    }),
    define({
      desc: 'subtract: 1 kg - 200 g = 0.8 kg',
      promise: () => expr(1, 'kg').subtract(200, 'g').convert('kg').magnitude.N(),
      result: 0.8,
    }),
    define({
      desc: 'subtract: negative result',
      promise: () => expr(1, 'kg').subtract(3, 'kg').magnitude.N(),
      result: -2,
    }),
    define({
      desc: 'unit: latex units are parsed',
      promise: () => expr(9.8, '\\mathrm{m}/\\mathrm{s}^2').unit,
      result: ['Divide', 'm', ['Power', 's', 2]],
    }),
    define({
      desc: 'unit: m/s^2 is stored in canonical form',
      promise: () => expr(9.8, 'm/s^2').unit,
      result: ['Divide', 'm', ['Power', 's', 2]],
    }),
  ])('$desc', async ({ promise, result }) => {
    expect(await promise()).toEqual(result)
  })

  test('throws on invalid input', () => {
    expect(() => expr({} as any, 'm')).toThrow()
  })
})

describe('set', () => {
  test.each<Test>([
    define({
      desc: 'intersect: {1, 2} ∩ {2, 3} = {2}',
      promise: () => expr('\\{1, 2\\}', 'set').intersect('\\{2, 3\\}').isEqual('\\{2\\}'),
      result: true,
    }),
    define({
      desc: 'isEqual: {1, 2} != {1, 3}',
      promise: () => expr('\\{1, 2\\}', 'set').isEqual('\\{1, 3\\}'),
      result: false,
    }),
    define({
      desc: 'isEqual: {1, 2} = {2, 1}',
      promise: () => expr('\\{1, 2\\}', 'set').isEqual('\\{2, 1\\}'),
      result: true,
    }),
    define({
      desc: 'isSubset: {1} is a subset of {1, 2}',
      promise: () => expr('\\{1\\}', 'set').isSubset('\\{1, 2\\}'),
      result: true,
    }),
    define({
      desc: 'isSubset: {3} is not a subset of {1, 2}',
      promise: () => expr('\\{3\\}', 'set').isSubset('\\{1, 2\\}'),
      result: false,
    }),
  ])('$desc', async ({ promise, result }) => {
    expect(await promise()).toEqual(result)
  })
})

describe('vector', () => {
  test.each<Test>([
    define({
      desc: 'cross: x × y = z',
      promise: () => expr([1, 0, 0], 'vector').cross([0, 1, 0]).isEqual([0, 0, 1]),
      result: true,
    }),
    define({
      desc: 'dot: (1, 2, 3) . (4, 5, 6) = 32',
      promise: () => expr([1, 2, 3], 'vector').dot([4, 5, 6]).N(),
      result: 32,
    }),
    define({
      desc: 'isEqual: (1, 2) != (1, 3)',
      promise: () => expr([1, 2], 'vector').isEqual([1, 3]),
      result: false,
    }),
    define({
      desc: 'isEqual: (1, 2) = (1, 2)',
      promise: () => expr([1, 2], 'vector').isEqual([1, 2]),
      result: true,
    }),
    define({
      desc: 'isEqual: different dimensions are not equal',
      promise: () => expr([1, 2], 'vector').isEqual([1, 2, 3]),
      result: false,
    }),
    define({
      desc: 'latex: (1, x)',
      promise: () => expr([1, 'x'], 'vector').latex(),
      result: '\\begin{bmatrix}1\\\\x\\end{bmatrix}',
    }),
    define({
      desc: 'norm: |(3, 4)| = 5',
      promise: () => expr([3, 4], 'vector').norm().N(),
      result: 5,
    }),
    define({
      desc: 'simplify: (x + x, 2 - 1) = (2x, 1)',
      promise: () => expr(['x + x', '2 - 1'], 'vector').simplify().isEqual(['2x', 1]),
      result: true,
    }),
  ])('$desc', async ({ promise, result }) => {
    expect(await promise()).toEqual(result)
  })

  test('cross: throws on non-3D vectors', () => {
    expect(() => expr([1, 2], 'vector').cross([3, 4])).toThrow()
  })

  test('dot: throws on different dimensions', () => {
    expect(() => expr([1, 2], 'vector').dot([1, 2, 3])).toThrow()
  })
})

describe('requests to SymAPI', () => {
  const x2 = expr('x^2')
  const asked = async (promise: () => unknown) => {
    takeSymapiRequests()
    const result = await promise()
    return { result, requests: takeSymapiRequests() }
  }

  test.each<{ desc: string; promise: () => unknown; requests: { path: string; body: unknown }[] }>([
    {
      desc: 'isEqual asks equal with both expressions',
      promise: () => x2.isEqual('x \\cdot x'),
      requests: [{ path: '/expr/equal', body: { expr1: x2.json, expr2: expr('x \\cdot x').json } }],
    },
    {
      desc: 'isEqual awaits a promised expression first',
      promise: () => x2.isEqual(Promise.resolve('x \\cdot x')),
      requests: [{ path: '/expr/equal', body: { expr1: x2.json, expr2: expr('x \\cdot x').json } }],
    },
    {
      desc: 'checkRoot asks whether the substituted expression equals 0',
      promise: () => expr('x - 2').checkRoot(2),
      requests: [{ path: '/expr/equal', body: { expr1: expr('2 - 2').json, expr2: 0 } }],
    },
    {
      desc: 'degree asks in x by default',
      promise: () => x2.degree(),
      requests: [{ path: '/expr/degree', body: { expr: x2.json, x: 'x' } }],
    },
    {
      desc: 'degree asks in the given variable',
      promise: () => x2.degree('y'),
      requests: [{ path: '/expr/degree', body: { expr: x2.json, x: 'y' } }],
    },
    ...(['gt', 'geq', 'lt', 'leq'] as const).map((comparison) => ({
      desc: `${comparison} asks compare with comparison ${comparison}`,
      promise: () => x2[comparison](0),
      requests: [{ path: '/expr/compare', body: { expr1: x2.json, expr2: 0, comparison } }],
    })),
    {
      desc: 'in asks inSet with the set second',
      promise: () => expr(2).in('\\mathbb{N}'),
      requests: [{ path: '/expr/inSet', body: { expr1: 2, expr2: expr('\\mathbb{N}').json } }],
    },
    {
      desc: 'isEquivalent asks equivalent',
      promise: () => expr('x = 2').isEquivalent('2x = 4'),
      requests: [
        {
          path: '/expr/equivalent',
          body: { expr1: expr('x = 2').json, expr2: expr('2x = 4').json },
        },
      ],
    },
    ...(['isExpanded', 'isFactored', 'isTrue', 'isPartialFractionDecomposition'] as const).map(
      (method) => ({
        desc: `${method} asks ${method} with the expression`,
        promise: () => x2[method](),
        requests: [{ path: `/expr/${method}`, body: { expr: x2.json } }],
      }),
    ),
    {
      desc: 'matches asks match with the pattern second',
      promise: () => x2.matches('a^2'),
      requests: [{ path: '/expr/match', body: { expr1: x2.json, expr2: expr('a^2').json } }],
    },
    {
      desc: 'roots asks for real roots by default',
      promise: () => x2.roots(),
      requests: [{ path: '/expr/roots', body: { expr: x2.json, complex: false } }],
    },
    {
      desc: 'roots asks for complex roots on demand',
      promise: () => x2.roots(true),
      requests: [{ path: '/expr/roots', body: { expr: x2.json, complex: true } }],
    },
    {
      desc: 'latex leaves expressions without instructions to Compute Engine',
      promise: () => x2.latex(),
      requests: [],
    },
    {
      desc: 'latex asks SymAPI to carry out instructions',
      promise: () => x2.diff().latex(),
      requests: [{ path: '/expr/latex', body: { expr: ['Derivative', x2.json, 'x'] } }],
    },
    {
      desc: 'apply asks for the latex once, then parses it',
      promise: () => x2.expand().apply(),
      requests: [{ path: '/expr/latex', body: { expr: ['Expand', x2.json] } }],
    },
    {
      desc: 'python with sympy carries out instructions first',
      promise: () => x2.diff().python(true),
      requests: [{ path: '/expr/latex', body: { expr: ['Derivative', x2.json, 'x'] } }],
    },
    {
      desc: 'isEqual with an error is decided by Compute Engine',
      promise: () => expr('\\pi').isEqual(3.14, 0.01),
      requests: [],
    },
    {
      desc: 'isEqual with an error carries out instructions first',
      promise: () => x2.diff().subs({ x: 1 }).isEqual(2, 0.01),
      requests: [
        { path: '/expr/latex', body: { expr: ['Subs', ['Derivative', x2.json, 'x'], 'x', 1] } },
      ],
    },
    {
      desc: 'set isEqual asks setEqual',
      promise: () => expr('\\{1\\}', 'set').isEqual('\\{1\\}'),
      requests: [
        {
          path: '/expr/setEqual',
          body: { expr1: expr('\\{1\\}').json, expr2: expr('\\{1\\}').json },
        },
      ],
    },
    {
      desc: 'set isSubset asks subset',
      promise: () => expr('\\{1\\}', 'set').isSubset('\\{1, 2\\}'),
      requests: [
        {
          path: '/expr/subset',
          body: { expr1: expr('\\{1\\}').json, expr2: expr('\\{1, 2\\}').json },
        },
      ],
    },
    {
      desc: 'solve sends a Solve instruction over the reals by default',
      promise: () => x2.solve().isEqual('\\{0\\}'),
      requests: [
        {
          path: '/expr/setEqual',
          body: {
            expr1: ['Solve', x2.json, 'x', 'RealNumbers'],
            expr2: expr('\\{0\\}').json,
          },
        },
      ],
    },
    {
      desc: 'vector isEqual asks equal once per component',
      promise: () => expr([1, 'x'], 'vector').isEqual([1, 'x']),
      requests: [
        { path: '/expr/equal', body: { expr1: 1, expr2: 1 } },
        { path: '/expr/equal', body: { expr1: 'x', expr2: 'x' } },
      ],
    },
    {
      desc: 'vector isEqual does not ask when dimensions differ',
      promise: () => expr([1], 'vector').isEqual([1, 2]),
      requests: [],
    },
    {
      desc: 'quantity isEqual is decided by Compute Engine',
      promise: () => expr(1000, 'g').isEqual(1, 'kg'),
      requests: [],
    },
    {
      desc: 'Compute Engine methods do not ask SymAPI',
      promise: () => [
        x2.evaluate(),
        x2.N(),
        x2.subs({ x: 2 }).N(),
        x2.count('x'),
        x2.hasSymbol(),
        x2.python(),
        expr('1 + i').isComplexRectangular(),
      ],
      requests: [],
    },
  ])('$desc', async ({ promise, requests }) => {
    expect((await asked(promise)).requests).toEqual(requests)
  })

  test.each<{ desc: string; promise: () => Promise<unknown>; result: unknown }>([
    {
      desc: 'an undecidable comparison is undefined, not null',
      promise: () => expr('x').gt(0),
      result: undefined,
    },
    {
      desc: 'an undecidable membership is undefined, not null',
      promise: () => expr('x').in('\\mathbb{Q}'),
      result: undefined,
    },
    {
      desc: 'the degree of 0 is -Infinity, not null',
      promise: () => expr(0).degree(),
      result: -Infinity,
    },
    {
      desc: 'roots are returned as latex strings',
      promise: () => expr('x^2 - 1').roots(),
      result: ['-1', '1'],
    },
  ])('$desc', async ({ promise, result }) => {
    expect(await promise()).toEqual(result)
  })

  test('errors from SymAPI reject with its status and detail', async () => {
    await expect(expr('\\sin x').degree()).rejects.toThrow(
      /^HTTP 422: .* is not a polynomial in x$/,
    )
  })
})
