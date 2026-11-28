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
         * The value is the one the model answer gives: write the code that computes the answer rather than the answer.
         * For `result()` and `output()`, values are compared in Python:
         * lists, dictionaries, sets and NumPy arrays by their content,
         * and numbers up to a relative error of 1e-9, or within `error` if given.
         * With `output()`, what the student printed counts too.
         * For `stdout()` and `error()`, the texts are compared.
         *
         * @example
         * 'Résultat final': expect.output().toEqualThatOf('import numpy as np\nnp.linalg.norm([3, 4])')
         * 'diff2(1) est correct': expect.with('diff2(1)').result().toEqualThatOf('f(1 + epsilon + delta).dual.dual')
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
        /**
         * The value is `expected`.
         * Numbers match up to a relative error of 1e-9, as Python's `math.isclose`, or within `error` if given;
         * `error = 0` asks for the very float Python computes, as when teaching how floats are rounded.
         * An error can only be given with a number.
         * `True` and `False` match `true` and `false`, and texts must be equal.
         *
         * @example
         * 'Le résultat vaut 42': expect.result().toBe(42)
         * '0.1 · 0.1 en Python': expect.output().toBe(0.1 * 0.1, 0)
         * 'Le code affiche Bonjour': expect.stdout().toBe('Bonjour')
         */
        toBe:
          <E extends T>(expected: E, ...[error]: ErrorFor<E>): Check =>
          async () => {
            const values = candidates(await run(), source)
            return values.some((value) => same(value.trim(), expected, error)) === !negate
          },
        /**
         * The text matches a regular expression.
         * No error counts as an empty one, so `not().error().toMatch(…)` holds when the code runs fine.
         *
         * @example
         * 'Le message salue': expect.stdout().toMatch(/bonjour/i)
         * "L'erreur est une division par zéro": expect.error().toMatch(/ZeroDivisionError/)
         */
        toMatch:
          (regex: RegExp): Check =>
          async () => {
            const values = candidates(await run(), source)
            return values.some((value) => regex.test(value)) === !negate
          },
        /**
         * The text passes a check of your own, a function given the text.
         *
         * @example
         * 'Le résultat est positif': expect.result().toSatisfy((text) => Number(text) > 0)
         */
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
        /**
         * The code's text matches a regular expression.
         * A comment or a string that contains the text counts too:
         * prefer `toCall`, `toUse`, `toImport` or `toDefine` when one fits.
         *
         * @example
         * 'Le code utilise epsilon': expect.code.toMatch(/epsilon/)
         * "linalg n'est pas utilisé": expect.code.not.toMatch(/linalg/)
         */
        toMatch:
          (regex: RegExp): Check =>
          () =>
            regex.test(code) !== (negate !== negated),
        /**
         * The code's text passes a check of your own, a function given the code.
         *
         * @example
         * 'Le code tient en 3 lignes': expect.code.toSatisfy((code) => code.trim().split('\n').length <= 3)
         */
        toSatisfy:
          (check: (code: string) => boolean): Check =>
          () =>
            check(code) !== (negate !== negated),
        /**
         * The code calls the function, read from its syntax: comments and strings don't count.
         * A dotted name, such as `'np.linalg.solve'`, also matches the function imported on its own, as `solve(…)`;
         * a plain name, such as `'sum'`, matches only that name, not `np.sum`.
         *
         * @example
         * 'np.cross est utilisé': expect.code.toCall('np.cross')
         * "sum n'est pas utilisé": expect.code.not.toCall('sum')
         */
        toCall: (name: string) => syntax('call', name),
        /**
         * The code uses the construct, read from its syntax:
         * `'for'` (a loop, or a comprehension), `'while'`, `'if'`, `'def'`, `'lambda'`, `'return'`, `'import'`, `'try'`, `'with'` or `'class'`.
         *
         * @example
         * 'Le code utilise une boucle while': expect.code.toUse('while')
         * 'Pas de boucle for': expect.code.not.toUse('for')
         */
        toUse: (construct: Construct) => syntax('use', construct),
        /**
         * The code imports the module, as `import numpy` or `from numpy.linalg import solve`.
         *
         * @example
         * 'numpy est importé': expect.code.toImport('numpy')
         */
        toImport: (module: string) => syntax('import', module),
        /**
         * The code defines the function, class or variable.
         *
         * @example
         * 'La fonction carre est définie': expect.code.toDefine('carre')
         */
        toDefine: (name: string) => syntax('define', name),
      }
    }

    /** Checks of the open figure, read as a property of the axes at `index`. */
    const figure = (property: string, index = 0) =>
      expect(`${code}\n_learning_figure(${JSON.stringify(property)}, ${index})`, state)

    return {
      /**
       * Checks of the code's text, without running it: `code.not` turns them around.
       *
       * @example
       * 'numpy est importé': expect.code.toImport('numpy')
       */
      code: { ...codeChecks(false), not: codeChecks(true) },
      /**
       * Checks of the error the code raises, its whole traceback as text: see also `toRaise`.
       *
       * @example
       * "L'erreur est une division par zéro": expect.with('inverse(0)').error().toMatch(/ZeroDivisionError/)
       */
      error: <T extends Value>() => getMethods<T>('error'),
      /**
       * Checks of the answer the code returns or prints:
       * its result, everything it printed, or the last line it printed.
       * Students often print their answer rather than give it on the last line:
       * prefer it to `result()`, unless the exercise is about the value returned.
       *
       * @example
       * 'Résultat final': expect.output().toEqualThatOf('2 * 21')
       */
      output: <T extends Value>() => getMethods<T>('output'),
      /**
       * Checks of the code's result: the value of its last line, as in a calculator.
       *
       * @example
       * 'Le résultat est celui du modèle': expect.result().toEqualThatOf('sum(range(10))')
       */
      result: <T extends Value>() => getMethods<T>('result'),
      /**
       * Checks of what the code printed with `print`, as text.
       *
       * @example
       * 'Le code affiche Bonjour': expect.stdout().toBe('Bonjour')
       */
      stdout: <T extends Value>() => getMethods<T>('stdout'),

      /**
       * Checks of a function the student defines, by its name.
       */
      function: (name: string) => ({
        /**
         * The function is defined.
         *
         * @example
         * 'moyenne est définie': expect.function('moyenne').toExist()
         */
        toExist: (): Check => () => verdict({ kind: 'function-exists', name }),
        /**
         * The function returns what the model answer's function of the same name does, for each call.
         * Each call is the list of its arguments, `[[2, 4, 6]]` for `moyenne([2, 4, 6])`,
         * or Python source, `'np.array([3, 4]), 2'`.
         * Values are compared as in `toEqualThatOf`, numbers within `error` if given.
         * On failure, the student sees which call failed:
         * a wrong value, a value printed rather than returned, or an error.
         *
         * @example
         * 'moyenne est correcte': expect.function('moyenne').toBehaveLike(
         *   'def moyenne(l):\n    return sum(l) / len(l)',
         *   [[[2, 4, 6]], [[5]], [[-1, 1]]],
         * )
         */
        toBehaveLike:
          (model: string, calls: (string | readonly unknown[])[], error?: number): Check =>
          () =>
            verdict({ kind: 'function-behaves', name, model, calls, error }, model),
      }),

      /**
       * Checks of the figures the code draws with Matplotlib, for exercises with `math`.
       * Each closes the figures once read.
       */
      matplotlib: {
        /**
         * A curve of the function, on any axes: its first and last points at `a` and `b`,
         * at least 41 points by default, and its values those of `fn`.
         * `fn` is NumPy code in `x`, such as `'np.sin(x)'`, or an expression of `expr`.
         * `settings` changes the number of points, the axes to read (counted from 0), or the error allowed on values.
         * On failure, the student sees why: no curve, wrong ends, too few points, or other values.
         *
         * @example
         * 'La courbe est tracée': expect.matplotlib.plot('np.sin(x)', -3, 3)
         * 'La tangente est tracée': expect.matplotlib.plot(expr('2x - 1'), 0, 2, { points: 2 })
         */
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
        /**
         * A scatter plot with these points, in any order:
         * the coordinates as lists of numbers, or Python source.
         *
         * @example
         * 'Les mesures sont placées': expect.matplotlib.scatter([1, 2, 3], [1, 4, 9])
         */
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
        /**
         * Checks of the number of axes in the figures, as made by `plt.subplots`.
         *
         * @example
         * 'Deux graphiques': expect.matplotlib.axesCount().toBe(2)
         */
        axesCount: () => figure('axes').result<number>(),
        /**
         * The grid is shown, on the first axes or those at `index`.
         *
         * @example
         * 'La grille est affichée': expect.matplotlib.grid()
         */
        grid: (index = 0) => figure('grid', index).result<boolean>().toBe(true),
        /**
         * Checks of the legend's texts, one per line.
         *
         * @example
         * 'La légende nomme le sinus': expect.matplotlib.legend().toMatch(/sinus/i)
         */
        legend: (index = 0) => figure('legend', index).result<string>(),
        /**
         * Checks of the number of curves on the first axes, or those at `index`.
         *
         * @example
         * 'Trois courbes': expect.matplotlib.lineCount().toBe(3)
         */
        lineCount: (index = 0) => figure('lines', index).result<number>(),
        /**
         * Checks that both axes have the same scale, as with `plt.axis('equal')`.
         *
         * @example
         * 'Les axes ont la même échelle': expect.matplotlib.sameScale().toBe(true)
         */
        sameScale: (index = 0) => figure('aspect', index).result<boolean>(),
        /**
         * Checks of the title.
         *
         * @example
         * 'Le titre parle du sinus': expect.matplotlib.title().toMatch(/sinus/i)
         */
        title: (index = 0) => figure('title', index).result<string>(),
        /**
         * Checks of the horizontal axis's name.
         *
         * @example
         * "L'axe x est nommé": expect.matplotlib.xLabel().toMatch(/x/)
         */
        xLabel: (index = 0) => figure('xlabel', index).result<string>(),
        /**
         * Checks of the horizontal axis's scale: `'linear'` or `'log'`.
         *
         * @example
         * "L'axe x est logarithmique": expect.matplotlib.xScale().toBe('log')
         */
        xScale: (index = 0) => figure('xscale', index).result<string>(),
        /**
         * Checks of the vertical axis's name.
         *
         * @example
         * "L'axe y est nommé": expect.matplotlib.yLabel().toMatch(/y/)
         */
        yLabel: (index = 0) => figure('ylabel', index).result<string>(),
        /**
         * Checks of the vertical axis's scale: `'linear'` or `'log'`.
         *
         * @example
         * "L'axe y est logarithmique": expect.matplotlib.yScale().toBe('log')
         */
        yScale: (index = 0) => figure('yscale', index).result<string>(),
      },

      /**
       * The checks that follow, turned around.
       *
       * @example
       * "Le code s'exécute sans erreur": expect.not().toError()
       */
      not: () => expect(code, { ...state, negate: !negate }),

      /**
       * The value of the code's last line is `expected`, Python source compared as a Python value:
       * lists, dictionaries, sets and NumPy arrays by their content, numbers within `error` if given.
       *
       * @example
       * 'La liste est triée': expect.with('trier([3, 1, 2])').toEqual('[1, 2, 3]')
       */
      toEqual:
        (expected: string, error?: number): Check =>
        () =>
          verdict({ kind: 'equal', expected, error }),
      /**
       * The code raises an error.
       *
       * @example
       * "Le code s'exécute sans erreur": expect.not().toError()
       */
      toError: (): Check => async () => ((await run()).error !== undefined) !== negate,
      /**
       * The code raises an error, of this exception if given, such as `'ValueError'`.
       * On failure, the student sees which exception was raised, if any.
       *
       * @example
       * 'racine(-1) lève ValueError': expect.with('racine(-1)').toRaise('ValueError')
       */
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
      /**
       * The code prints `expected`, and nothing else.
       *
       * @example
       * 'Le code affiche Bonjour': expect.toPrint('Bonjour')
       */
      toPrint: (expected: Value) => expect(code, state).stdout().toBe(expected),
      /**
       * The code's last line has the value `expected`: as `result().toBe`.
       *
       * @example
       * 'carre(3) vaut 9': expect.with('carre(3)').toReturn(9)
       */
      toReturn: <E extends Value>(expected: E, ...error: ErrorFor<E>) =>
        expect(code, state)
          .result<E>()
          .toBe(expected, ...error),
      /**
       * The code returns or prints `expected`, even after other lines: as `output().toBe`.
       * Students often print their answer: prefer it to `toReturn` for a final answer.
       *
       * @example
       * 'La réponse est 42': expect.toShow(42)
       * '0.1 · 0.1 en Python': expect.toShow(0.1 * 0.1, 0)
       */
      toShow: <E extends Value>(expected: E, ...error: ErrorFor<E>) =>
        expect(code, state)
          .output<E>()
          .toBe(expected, ...error),
      /**
       * The code's result passes a check of your own: as `result().toSatisfy`.
       *
       * @example
       * 'Le résultat est pair': expect.toSatisfy((text) => Number(text) % 2 === 0)
       */
      toSatisfy: (check: (code: string) => boolean | Promise<boolean>) =>
        expect(code, state).result().toSatisfy(check),
      /**
       * The code, followed by `more`: to call what the student defined.
       *
       * @example
       * 'carre(3) vaut 9': expect.with('carre(3)').toReturn(9)
       */
      with: (more: string) => expect(`${code}\n${more}`, state),
      /**
       * Runs the code with these lines for `input()`, read in order.
       * As in a terminal, `input()` prints its prompt and the line read:
       * check what is printed with `toShow`, which reads the last line, or `stdout().toMatch`.
       *
       * @example
       * 'Bonjour Alice': expect.withInput('Alice').toShow('Bonjour Alice')
       * 'Somme de 3 et 4': expect.withInput('3', '4').toShow(7)
       */
      withInput: (...lines: string[]) => expect(code, { ...state, stdin: lines }),
    }
  }
}
