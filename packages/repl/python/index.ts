import { createWorkerTransport, stream } from '../transport'
import type { FinalOutput, Transport } from '../types'
import { createExpect } from './expect'

export type Options = {
  /** Adds NumPy and dual numbers, and shows LaTeX results and Matplotlib figures. */
  math?: boolean
  /** Run by a check: figures are left for the check to read, and the checks are loaded. */
  test?: boolean
  /** The lines `input()` reads, in order. */
  stdin?: string[]
  /** Seconds the code may run before it is stopped, 10 by default. */
  timeout?: number
  /** For a check, the student's code that `code` runs: errors point to its lines. */
  source?: string
  /** For a check, other code it runs, whose imports are loaded too. */
  imports?: string
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

  const expect = createExpect(output)

  return { expect, run, test: runPythonTest, output }
}

/** Runs the code in a Web Worker, where Pyodide doesn't freeze the page. */
export const python = createPython(
  createWorkerTransport<Options>(
    () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
    {
      timeout: (input) => (input.options?.timeout ?? 10) * 1000,
      timeoutError: (milliseconds) =>
        `Le code a été arrêté après ${milliseconds / 1000} secondes\u00a0: contient-il une boucle infinie\u202f?`,
    },
  ),
)
