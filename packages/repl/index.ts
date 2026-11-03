import dedent from 'dedent'
import { allKeyed } from 'es-toolkit'
import { EventIterator } from 'event-iterator'
import type { Expression } from '../core'

const worker = new Worker(new URL('./python/worker.ts', import.meta.url), { type: 'module' })

export type FinalOutput = {
  format: 'text' | 'latex' | 'image'
  result?: string
  stdout?: string
  error?: string
}

export type Output =
  | {
      id: string
      result?: string
      error?: string
      stdout?: string
      format?: 'text' | 'latex' | 'image'
      status?: never
    }
  | {
      id: string
      status: 'loading' | 'importing' | 'executing'
      error?: never
      result?: never
      stdout?: never
      format?: never
    }

type Options = {
  math?: boolean
  test?: boolean
}

export type Input = {
  id: string
  code: string
  options?: Options
}

async function* run(code: string, options?: Options) {
  if (!code) {
    yield { id: crypto.randomUUID(), result: '' }
    return
  }
  const promiseId = crypto.randomUUID()
  const iterator = new EventIterator<Output>(({ push, stop }) => {
    const listener = (event: MessageEvent<Output>) => {
      if (event.data?.id !== promiseId) return
      push(event.data)
    }
    worker.addEventListener('message', listener)
    return () => worker.removeEventListener('message', listener)
  })
  worker.postMessage({ id: promiseId, code, options } satisfies Input)
  for await (const status of iterator) {
    yield status
  }
}

async function output(code: string, options?: Options): Promise<FinalOutput> {
  for await (const chunk of run(code, options)) {
    if (!chunk.status) {
      return chunk as FinalOutput
    }
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
  function getMethods<T = string | number | boolean>(type: 'result' | 'stdout' | 'error') {
    return {
      toEqualThatOf(modelAnswer: string) {
        return async () => {
          const { res1, res2 } = await allKeyed({
            res1: output(code, { math: state.math ?? false, test: true }),
            res2: output(modelAnswer, { math: state.math ?? false, test: true }),
          })
          return (res1[type]?.trim() === res2[type]?.trim()) === !negate
        }
      },
      toBe: (expected: T) => async () => {
        const res = await output(code, { math: state.math ?? false, test: true })
        let [out, ans] = [res[type]?.trim() ?? '', String(expected).trim()]
        if (typeof expected === 'boolean') {
          out = out.toLowerCase()
          ans = String(expected).toLowerCase()
        }
        return (out === ans) === !negate
      },
      toMatch: (regex: RegExp) => async () => {
        const res = await output(code, { math: state.math ?? false, test: true })
        if (res[type] === undefined) return false
        return regex.test(res[type]) === !negate
      },
      toSatisfy: (check: (result: string) => boolean | Promise<boolean>) => async () => {
        const res = await output(code, { math: state.math ?? false, test: true })
        if (res[type] === undefined) return false
        return check(res[type]) === !negate
      },
    }
  }
  return {
    code: {
      toMatch: (regex: RegExp) => () => regex.test(code) === !negate,
    },
    error: <T extends string | number | boolean>() => getMethods<T>('error'),
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
        const fnCode = typeof fn === 'string' ? fn : fn.python()
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
          .toReturn(true)
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
    toPrint: (expected: string | boolean | number) => async () => {
      const res = await output(code, { math: state.math ?? false, test: true })
      return (res.result?.trim() === String(expected)) !== negate
    },
    toReturn: (expected: string | boolean | number) => expect(code, state).result().toBe(expected),
    toSatisfy: (check: (code: string) => boolean | Promise<boolean>) =>
      expect(code, state).result().toSatisfy(check),
    with: (t: string) => expect(`${code}\n${t}`, state),
  }
}

export const python = {
  expect,
  run,
  test: runPythonTest,
  output,
}
