import { mock } from 'bun:test'

type Output = {
  status: 'loading' | 'importing' | 'executing' | 'done'
  result?: string
  stdout?: string
  error?: string
  format?: 'text' | 'latex' | 'image'
}

/** Stands in for Pyodide: `run` reports loading, then yields what `outputs` has for the code. */
export const repl = {
  runs: [] as { code: string; options?: { math?: boolean; stdin?: string[] } }[],
  outputs: {} as Record<string, Omit<Output, 'status'>>,
  /** Resolves the pending runs; until then they stay at `loading`. */
  release: () => {},
  reset() {
    repl.runs = []
    repl.outputs = {}
    gate = Promise.withResolvers<void>()
    repl.release = gate.resolve
  },
}
let gate = Promise.withResolvers<void>()
repl.reset()

mock.module('@learning/repl', () => ({
  python: {
    async *run(
      code: string,
      options?: { math?: boolean; stdin?: string[] },
    ): AsyncGenerator<Output> {
      repl.runs.push({ code, options })
      yield { status: 'loading' }
      await gate.promise
      yield { status: 'done', ...(repl.outputs[code] ?? { result: '' }) }
    },
  },
}))
