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
  /**
   * Runs the code, giving each step as it happens, then the result, what was printed, or the error.
   *
   * @example
   * for await (const output of python.run('print("Bonjour")')) {
   *   if (output.status === 'done') console.log(output.stdout) // Bonjour
   * }
   */
  const run = (code: string, options?: Options) => stream(transport, code, options)

  /**
   * Runs the code, and gives its result, what it printed, or its error, once done.
   *
   * @example
   * const { result } = await python.output('6 * 7', { math: true }) // '42'
   */
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

  /**
   * The checks of a student's code, as `PythonCode`'s `tests` receive them:
   * each method gives a check, run when the student submits.
   * Hover each method for its description and an example.
   *
   * @example
   * <PythonCode
   *   id="carre"
   *   prompt={<p>Définissez une fonction <code>carre</code>.</p>}
   *   tests={(expect) => ({
   *     'carre est correcte': expect.function('carre').toBehaveLike('def carre(x):\n    return x * x', [[3], [-2], [0.5]]),
   *     "Pas d'appel à pow": expect.code.not.toCall('pow'),
   *   })}
   * />
   */
  const expect = createExpect(output)

  return {
    expect,
    run,
    /** @deprecated Checks are written with `expect`. */
    test: runPythonTest,
    output,
  }
}

/**
 * Python in the page, with Pyodide in a Web Worker, where it doesn't freeze the page.
 * `python.expect(code)` gives the checks of exercises,
 * and `python.output(code)` runs code and gives its result.
 * Code running for more than 10 seconds is stopped, as an infinite loop.
 */
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
