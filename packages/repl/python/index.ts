import dedent from 'dedent'
import { allKeyed } from 'es-toolkit'
import type { Expression } from '../../core'
import { createWorkerTransport, stream } from '../transport'
import type { FinalOutput, Transport } from '../types'

export type Options = {
  /** Adds NumPy and dual numbers, and shows LaTeX results and Matplotlib figures. */
  math?: boolean
  /** Run by a check: figures are left for the check to read. */
  test?: boolean
}

type Source = 'result' | 'stdout' | 'error' | 'output'

/**
 * The values a check reads.
 * For `output`, any of the result, everything printed, and the last line printed, whichever there is.
 */
function candidates(out: FinalOutput, source: Source): string[] {
  if (source !== 'output') return [out[source] ?? '']
  const printed = out.stdout?.trim() ?? ''
  return [out.result ?? '', printed, printed.split('\n').at(-1) ?? ''].filter(
    (value) => value.trim() !== '',
  )
}

/**
 * Whether Python's text for a value is the expected value:
 * `True` is `true`, and `4.0` is `4`, up to rounding (`0.1 + 0.2` is `0.3`).
 */
function same(out: string, expected: string | number | boolean) {
  if (typeof expected === 'boolean') return out.toLowerCase() === String(expected)
  if (typeof expected === 'number') {
    const value = Number(out)
    return out !== '' && Math.abs(value - expected) <= 1e-9 * Math.max(1, Math.abs(expected))
  }
  return out === expected.trim()
}

/** The Python API, running code through `transport`: the page's worker, or Pyodide itself in tests. */
export function createPython(transport: Transport<Options>) {
  /** Each step of running the code, ending with the `done` output. */
  const run = (code: string, options?: Options) => stream(transport, code, options)

  async function output(code: string, options?: Options): Promise<FinalOutput> {
    for await (const chunk of run(code, options)) {
      if (chunk.status === 'done') return chunk as FinalOutput
    }
    throw new Error('No output received')
  }

  async function runPythonTest(
    code: string,
    test: string | null,
    check: (output: FinalOutput) => boolean | Promise<boolean>,
  ): Promise<FinalOutput & { passed: boolean }> {
    const out = await output(`${code}${test ? `\n${test}` : ''}`)
    return { ...out, passed: await check(out) }
  }

  function expect(code: string, state: { negate?: boolean; math?: boolean } = {}) {
    const { negate } = state
    function getMethods<T extends string | number | boolean = string | number | boolean>(
      source: Source,
    ) {
      const run = (code: string) => output(code, { math: state.math ?? false, test: true })
      return {
        toEqualThatOf(modelAnswer: string, error?: number) {
          return async () => {
            const { student, model } = await allKeyed({
              student: run(code),
              model: run(modelAnswer),
            })
            const expected = (candidates(model, source)[0] ?? '').trim()
            const equal = (value: string) =>
              error === undefined
                ? value.trim() === expected
                : Math.abs(Number.parseFloat(value) - Number.parseFloat(expected)) <= error
            return candidates(student, source).some(equal) === !negate
          }
        },
        toBe: (expected: T) => async () => {
          const values = candidates(await run(code), source)
          return values.some((value) => same(value.trim(), expected)) === !negate
        },
        // No error is an empty one: `not().error().toMatch(…)` then holds.
        toMatch: (regex: RegExp) => async () => {
          const values = candidates(await run(code), source)
          return values.some((value) => regex.test(value)) === !negate
        },
        toSatisfy: (check: (result: string) => boolean | Promise<boolean>) => async () => {
          const values = candidates(await run(code), source)
          const results = await Promise.all(values.map(check))
          return results.some(Boolean) === !negate
        },
      }
    }
    return {
      code: {
        toMatch: (regex: RegExp) => () => regex.test(code) === !negate,
        toSatisfy: (check: (code: string) => boolean) => () => check(code) === !negate,
        not: {
          toMatch: (regex: RegExp) => () => regex.test(code) === (negate ?? false),
          toSatisfy: (check: (code: string) => boolean) => () => check(code) === (negate ?? false),
        },
      },
      error: <T extends string | number | boolean>() => getMethods<T>('error'),
      /** The result, or what was printed: students often print their answer rather than return it. */
      output: <T extends string | number | boolean>() => getMethods<T>('output'),
      matplotlib: {
        grid: () =>
          expect(code, state)
            .with(
              dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              x = any(line.get_visible() for line in ax.get_xgridlines())
              y = any(line.get_visible() for line in ax.get_ygridlines())
              plt.close("all")
              x and y
            `,
            )
            .result<boolean>()
            .toBe(true),
        lineCount: () =>
          expect(code, state)
            .with(
              dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              plt.close("all")
              len(ax.get_lines())
            `,
            )
            .result<number>(),
        plot: (fn: string | Expression<'output'>, a: number, b: number, n: number = 40) => {
          return async () => {
            const fnCode = typeof fn === 'string' ? fn : await fn.python(true)
            return expect(code, state)
              .with(
                dedent /* python */ `
              import matplotlib.pyplot as plt
              import numpy as np
              ax = plt.gcf().axes[0]
              result = False

              for line in ax.get_lines():
                x = np.array(line.get_xdata())
                y = np.array(line.get_ydata())
                checks = [
                  bool(x[0] == ${a} and x[-1] == ${b}),
                  len(x) > ${n},
                  np.allclose(y, ${fnCode}),
                ]
                print("Checks:", checks)
                if all(checks):
                  result = True
                  break

              plt.close("all")
              result
            `,
              )
              .toReturn(true)()
          }
        },
        sameScale: () =>
          expect(code, state)
            .with(
              dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              plt.close('all')
              ax.get_aspect() == 1
            `,
            )
            .result<boolean>(),
        title: () =>
          expect(code, state)
            .with(
              dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              plt.close('all')
              ax.get_title()
            `,
            )
            .result<string>(),
        xLabel: () =>
          expect(code, state)
            .with(
              dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              plt.close('all')
              ax.get_xlabel()
            `,
            )
            .result<string>(),
        yLabel: () =>
          expect(code, state)
            .with(
              dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              plt.close('all')
              ax.get_ylabel()
            `,
            )
            .result<string>(),
      },
      not: () => expect(code, { ...state, negate: !negate }),
      result: <T extends string | number | boolean>() => getMethods<T>('result'),
      stdout: <T extends string | number | boolean>() => getMethods<T>('stdout'),
      toError: () => async () => {
        const res = await output(code, { math: state.math ?? false, test: true })
        return (res.error !== undefined) !== negate
      },
      toPrint: (expected: string | boolean | number) => expect(code, state).stdout().toBe(expected),
      toReturn: (expected: string | boolean | number) =>
        expect(code, state).result().toBe(expected),
      toSatisfy: (check: (code: string) => boolean | Promise<boolean>) =>
        expect(code, state).result().toSatisfy(check),
      with: (t: string) => expect(`${code}\n${t}`, state),
    }
  }

  return { expect, run, test: runPythonTest, output }
}

/** Runs the code in a Web Worker, where Pyodide doesn't freeze the page. */
export const python = createPython(
  createWorkerTransport(
    () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  ),
)
