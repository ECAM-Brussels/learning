import dedent from 'dedent'
import { EventIterator } from 'event-iterator'
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
}

export type Input = {
  id: string
  code: string
  options?: Options
}

async function* run(code: string, options?: { math: boolean }) {
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

async function output(code: string, options?: { math: boolean }): Promise<FinalOutput> {
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

function expect(code: string, desc?: string) {
  function getMethods<T = string | number | boolean>(type: 'result' | 'stdout') {
    return {
      toBe: (expected: T) => ({
        desc,
        fn: async () => {
          const res = await output(code)
          return res[type]?.trim() === String(expected)
        },
      }),
      toMatch: (regex: RegExp) => ({
        desc,
        fn: async () => {
          const res = await output(code)
          if (res[type] === undefined) return false
          return regex.test(res[type])
        },
      }),
      toSatisfy: (check: (result: string) => boolean | Promise<boolean>) => ({
        desc,
        fn: async () => {
          const res = await output(code)
          if (res[type] === undefined) return false
          return check(res[type])
        },
      }),
    }
  }
  return {
    desc: (newDescription: string) => expect(code, newDescription),
    matplotlib: {
      lineCount: () =>
        expect(code, desc)
          .with(
            dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              plt.close("all")
              len(ax.get_lines())
            `,
          )
          .result<number>(),
      sameScale: () =>
        expect(code, desc)
          .with(
            dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              ax.get_aspect() == 1
            `,
          )
          .result<boolean>(),
      xLabel: () =>
        expect(code, desc)
          .with(
            dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              ax.get_xlabel()
            `,
          )
          .result<string>(),
      yLabel: () =>
        expect(code, desc)
          .with(
            dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              ax.get_ylabel()
            `,
          )
          .result<string>(),
    },
    result: <T extends string | number | boolean>() => getMethods<T>('result'),
    stdout: <T extends string | number | boolean>() => getMethods<T>('stdout'),
    toError: {
      desc,
      fn: async () => {
        const res = await output(code)
        return res.error !== undefined
      },
    },
    toPrint: (expected: string | boolean | number) => ({
      desc,
      fn: async () => {
        const res = await output(code)
        return res.result?.trim() === String(expected)
      },
    }),
    toReturn: (expected: string | boolean | number) => expect(code, desc).result().toBe(expected),
    toSatisfy: (check: (code: string) => boolean | Promise<boolean>) =>
      expect(code, desc).result().toSatisfy(check),
    with: (t: string) => expect(`${code}\n${t}`, desc),
  }
}

export const python = {
  expect,
  run,
  test: runPythonTest,
  output,
}
