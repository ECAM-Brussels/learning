import type { Options } from '.'
import type { Expression } from '../../core'
import type { FinalOutput } from '../types'
import { formatError } from './execute'

/** The verdict of a check, with what went wrong for the student when it fails. */
export type CheckResult = { passed: boolean; message?: string }

/** A check of a student's code: older checks answer with a boolean. */
export type Check = () => boolean | CheckResult | Promise<boolean | CheckResult>

type Value = string | number | boolean
type Source = 'result' | 'stdout' | 'error' | 'output'
type State = { negate?: boolean; math?: boolean; stdin?: string[] }

/** An error only goes with a number: `toBe(42, 0.01)` compiles, `toBe('bonjour', 0.01)` doesn't. */
type ErrorFor<E> = E extends number ? [error?: number] : []

/** The constructs `code.toUse` recognises. */
export type Construct =
  'for' | 'while' | 'if' | 'def' | 'lambda' | 'return' | 'import' | 'try' | 'with' | 'class'

export type PlotOptions = {
  /** How many points the curve has at least, 41 by default. */
  points?: number
  /** The index of the axes to read, among every figure's; any of them by default. */
  axes?: number
  /** How far the curve's values may be from the function's; NumPy's `allclose` by default. */
  error?: number
}

/**
 * Whether two numbers are equal within `error`, or by default up to a relative error of 1e-9,
 * as Python's `math.isclose`: `0.1 + 0.2` is `0.3`, but `0` isn't `1e-17`.
 * `error = 0` asks for the very float, as when an exercise teaches how floats are rounded.
 */
function close(a: number, b: number, error?: number) {
  if (a === b) return true
  const gap = Math.abs(a - b)
  return error === undefined ? gap <= 1e-9 * Math.max(Math.abs(a), Math.abs(b)) : gap <= error
}

/** The number a text is, or NaN: `Number('')` would be 0. */
const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text))

/** Whether Python's text for a value is the expected value: `True` is `true`, numbers are `close`. */
function same(out: string, expected: Value, error?: number) {
  if (typeof expected === 'boolean') return out.toLowerCase() === String(expected)
  if (typeof expected === 'number') return close(toNumber(out), expected, error)
  return out === expected.trim()
}

/**
 * The texts a check reads.
 * For `output`, any of the result, everything printed, and the last line printed, whichever there is.
 */
function candidates(out: FinalOutput, source: Source): string[] {
  if (source !== 'output') return [out[source] ?? '']
  const printed = out.stdout?.trim() ?? ''
  return [out.result ?? '', printed, printed.split('\n').at(-1) ?? ''].filter(
    (value) => value.trim() !== '',
  )
}

/** The name of the exception a traceback ends with, such as `ValueError`. */
const raised = (error: string) =>
  error
    .trim()
    .split('\n')
    .at(-1)
    ?.match(/^([\w.]+)(:|$)/)?.[1]

/** Checks of students' Python code, run through `output`. */
export function createExpect(output: (code: string, options?: Options) => Promise<FinalOutput>) {
  return function expect(code: string, state: State = {}) {
    const negate = state.negate ?? false
    const options = (extra: Partial<Options> = {}): Options => ({
      math: state.math ?? false,
      test: true,
      stdin: state.stdin,
      ...extra,
    })
    const run = (source = code) => output(source, options())

    /** Runs a check of `checks.py` on the code; `imports` is other code it runs, such as a model answer. */
    async function verdict(
      check: Record<string, unknown>,
      imports?: string,
      flipped = false,
    ): Promise<CheckResult> {
      const negated = negate !== flipped
      const program = `_learning_check(${JSON.stringify(JSON.stringify({ code, stdin: state.stdin, ...check }))})`
      const out = await output(program, options({ source: code, imports }))
      const result: { passed: boolean; message?: string | null; error?: string | null } = out.error
        ? { passed: false, error: out.error }
        : JSON.parse(out.result ?? '')
      if (result.passed !== negated) return { passed: true }
      if (negated) return { passed: false }
      const message = result.error ? formatError(result.error, code) : result.message
      return { passed: false, ...(message ? { message } : {}) }
    }

    /** Checks of a text the code gives: its result, what it printed, its error, or the first two. */
    function getMethods<T extends Value = Value>(source: Source) {
      return {
        /**
         * The value is the model answer's: compared as Python values for `result` and `output`,
         * within `error` for numbers, and as text for `stdout` and `error`.
         */
        toEqualThatOf(model: string, error?: number): Check {
          if (source === 'result' || source === 'output') {
            return () => verdict({ kind: 'equal-that-of', model, source, error }, model)
          }
          return async () => {
            const [student, reference] = await Promise.all([run(), run(model)])
            const expected = (candidates(reference, source)[0] ?? '').trim()
            const equal = (value: string) => {
              const [x, y] = [toNumber(value), toNumber(expected)]
              if (!Number.isNaN(x) && !Number.isNaN(y)) return close(x, y, error)
              return value.trim() === expected
            }
            return candidates(student, source).some(equal) === !negate
          }
        },
        /** `error` is how far a number may be from `expected`; see `close`. */
        toBe:
          <E extends T>(expected: E, ...[error]: ErrorFor<E>): Check =>
          async () => {
            const values = candidates(await run(), source)
            return values.some((value) => same(value.trim(), expected, error)) === !negate
          },
        // No error is an empty one: `not().error().toMatch(…)` then holds.
        toMatch:
          (regex: RegExp): Check =>
          async () => {
            const values = candidates(await run(), source)
            return values.some((value) => regex.test(value)) === !negate
          },
        toSatisfy:
          (check: (result: string) => boolean | Promise<boolean>): Check =>
          async () => {
            const values = candidates(await run(), source)
            const results = await Promise.all(values.map(check))
            return results.some(Boolean) === !negate
          },
      }
    }

    /** Checks of the code's text, `not` turning them around. */
    function codeChecks(negated: boolean) {
      const syntax =
        (check: string, name: string): Check =>
        () =>
          verdict({ kind: 'code', check, name }, undefined, negated)
      return {
        toMatch:
          (regex: RegExp): Check =>
          () =>
            regex.test(code) !== (negate !== negated),
        toSatisfy:
          (check: (code: string) => boolean): Check =>
          () =>
            check(code) !== (negate !== negated),
        /** The code calls the function, such as `sum` or `np.linalg.solve`: comments and strings don't count. */
        toCall: (name: string) => syntax('call', name),
        /** The code uses the construct, such as a `for` loop or a comprehension. */
        toUse: (construct: Construct) => syntax('use', construct),
        toImport: (module: string) => syntax('import', module),
        /** The code defines the function, class or variable. */
        toDefine: (name: string) => syntax('define', name),
      }
    }

    /** Checks of the open figure, read as a property of the axes at `index`. */
    const figure = (property: string, index = 0) =>
      expect(`${code}\n_learning_figure(${JSON.stringify(property)}, ${index})`, state)

    return {
      code: { ...codeChecks(false), not: codeChecks(true) },
      error: <T extends Value>() => getMethods<T>('error'),
      /** The result, or what was printed: students often print their answer rather than return it. */
      output: <T extends Value>() => getMethods<T>('output'),
      result: <T extends Value>() => getMethods<T>('result'),
      stdout: <T extends Value>() => getMethods<T>('stdout'),

      /** Checks of a function the student defines. */
      function: (name: string) => ({
        toExist: (): Check => () => verdict({ kind: 'function-exists', name }),
        /**
         * The function returns what the model answer's does, for each call:
         * `calls` gives the arguments of each, as Python source (`'np.array([1, 2]), 3'`) or as a list.
         */
        toBehaveLike:
          (model: string, calls: (string | readonly unknown[])[], error?: number): Check =>
          () =>
            verdict({ kind: 'function-behaves', name, model, calls, error }, model),
      }),

      matplotlib: {
        plot:
          (
            fn: string | Expression<'output'>,
            a: number,
            b: number,
            settings: number | PlotOptions = {},
          ): Check =>
          async () => {
            // A number of points was once the count to exceed.
            const { points = 41, ...rest } =
              typeof settings === 'number' ? { points: settings + 1 } : settings
            const source = typeof fn === 'string' ? fn : await fn.python(true)
            return verdict({ kind: 'plot', fn: source, a, b, points, ...rest })
          },
        /** A scatter plot of these points, in any order: Python source or lists of numbers. */
        scatter:
          (
            x: string | readonly number[],
            y: string | readonly number[],
            settings: Omit<PlotOptions, 'points'> = {},
          ): Check =>
          () => {
            const source = (values: string | readonly number[]) =>
              typeof values === 'string' ? values : JSON.stringify(values)
            return verdict({ kind: 'scatter', x: source(x), y: source(y), ...settings })
          },
        axesCount: () => figure('axes').result<number>(),
        grid: (index = 0) => figure('grid', index).result<boolean>().toBe(true),
        legend: (index = 0) => figure('legend', index).result<string>(),
        lineCount: (index = 0) => figure('lines', index).result<number>(),
        sameScale: (index = 0) => figure('aspect', index).result<boolean>(),
        title: (index = 0) => figure('title', index).result<string>(),
        xLabel: (index = 0) => figure('xlabel', index).result<string>(),
        xScale: (index = 0) => figure('xscale', index).result<string>(),
        yLabel: (index = 0) => figure('ylabel', index).result<string>(),
        yScale: (index = 0) => figure('yscale', index).result<string>(),
      },

      not: () => expect(code, { ...state, negate: !negate }),

      /** The value of the code's last line is `expected`, Python source compared as a Python value. */
      toEqual:
        (expected: string, error?: number): Check =>
        () =>
          verdict({ kind: 'equal', expected, error }),
      toError: (): Check => async () => ((await run()).error !== undefined) !== negate,
      /** The code raises an error, of this exception if given, such as `'ValueError'`. */
      toRaise:
        (exception?: string): Check =>
        async () => {
          const { error } = await run()
          const kind = error === undefined ? undefined : raised(error)
          const passed = error !== undefined && (exception === undefined || kind === exception)
          if (passed !== negate) return { passed: true }
          if (negate) return { passed: false }
          return {
            passed: false,
            message:
              kind === undefined
                ? `aucune erreur n'est levée, au lieu de ${exception ?? 'une erreur'}`
                : `${kind} est levée, au lieu de ${exception}`,
          }
        },
      toPrint: (expected: Value) => expect(code, state).stdout().toBe(expected),
      toReturn: <E extends Value>(expected: E, ...error: ErrorFor<E>) =>
        expect(code, state)
          .result<E>()
          .toBe(expected, ...error),
      /** The result or what was printed is `expected`: students often print their answer. */
      toShow: <E extends Value>(expected: E, ...error: ErrorFor<E>) =>
        expect(code, state)
          .output<E>()
          .toBe(expected, ...error),
      toSatisfy: (check: (code: string) => boolean | Promise<boolean>) =>
        expect(code, state).result().toSatisfy(check),
      /** The code, then `more`: to call what the student defined, such as `with('carre(3)')`. */
      with: (more: string) => expect(`${code}\n${more}`, state),
      /** Runs the code with these lines for `input()`, read in order. */
      withInput: (...lines: string[]) => expect(code, { ...state, stdin: lines }),
    }
  }
}
