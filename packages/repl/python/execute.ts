import dedent from 'dedent'
import type { PyodideAPI } from 'pyodide'
import type { Options } from '.'
import type { Input, Output } from '../types'

/** Python the runner adds to a run, each under its own name: its frames never show in a traceback. */
export type Helpers = {
  /** Dual numbers, for `math`. */
  dualNumbers: string
  /** The checks called by `expect`, for `test`. */
  checks: string
}

/**
 * Runs Python code on one Pyodide instance, reporting each step through `post`:
 * `loading`, `importing`, `executing`, then `done` with the result, what was printed, or the error.
 * Pyodide is loaded on the first run, and again after a failed load.
 */
export function createExecutor(load: () => Promise<PyodideAPI>, helpers: Helpers) {
  let pyodide: Promise<PyodideAPI> | undefined
  // Runs share the interpreter: run concurrently, a student's code could see the model answer's names.
  let queue: Promise<void> = Promise.resolve()

  async function execute({ id, code, options }: Input<Options>, post: (output: Output) => void) {
    const output: Output = { id, status: 'done' }
    // A check runs the student's code from within its own: imports and errors are the student's.
    const sources = [code, options?.source, options?.imports].filter((s) => s !== undefined)
    try {
      pyodide ??= load().catch((error) => {
        pyodide = undefined
        throw error
      })
      const py = await pyodide
      post({ id, status: 'importing' })
      for (const source of sources) await py.loadPackagesFromImports(source)
      if (options?.math || options?.test) await py.loadPackage('numpy')
      post({ id, status: 'executing' })
      py.globals.clear()
      const helper = (source: string, filename: string) => py.runPython(source, { filename })
      helper(
        dedent`
          import sys
          if "matplotlib.pyplot" in sys.modules:
              sys.modules["matplotlib.pyplot"].close("all")
        `,
        'reset.py',
      )
      if (sources.some((source) => source.includes('matplotlib'))) {
        helper('import os\nos.environ["MPLBACKEND"] = "AGG"', 'reset.py')
      }
      if (options?.math) helper(helpers.dualNumbers, 'automatic_diff.py')
      if (options?.test) helper(helpers.checks, 'checks.py')
      py.globals.set('_learning_stdin', py.toPy(options?.stdin ?? []))
      helper(
        dedent`
          import builtins, sys
          from io import StringIO

          def _learning_input(prompt="", _lines=list(_learning_stdin)):
              print(prompt, end="")
              if not _lines:
                  raise EOFError("le programme demande plus d'entrées que celles données")
              line = _lines.pop(0)
              print(line)
              return line

          builtins.input = _learning_input
          del _learning_stdin
          sys.stdout = StringIO()
        `,
        'input.py',
      )
      const result = py.runPython(code)
      try {
        output.result = String(result ?? '')
        output.stdout = py.runPython('sys.stdout.getvalue()')
        if (options?.math && result?._repr_latex_ !== undefined) {
          output.result = String(result._repr_latex_()).slice(1, -1)
          output.format = 'latex'
        } else if (options?.math && !options.test && code.includes('matplotlib')) {
          output.result = `data:image/png;base64,${py.runPython(dedent`
            import base64
            import io
            import matplotlib.pyplot as plt

            buffer = io.BytesIO()
            plt.savefig(buffer, format="png")
            plt.close()
            base64.b64encode(buffer.getvalue()).decode("utf-8")
          `)}`
          output.format = 'image'
        }
      } finally {
        // A Python object kept by JavaScript stays in Pyodide's memory until destroyed.
        result?.destroy?.()
      }
    } catch (error) {
      output.error = formatError(error, options?.source ?? code)
    } finally {
      post(output)
    }
  }

  return (input: Input<Options>, post: (output: Output) => void) => {
    post({ id: input.id, status: 'loading' })
    const run = queue.then(() => execute(input, post))
    queue = run.catch(() => {})
    return run
  }
}

/**
 * Keeps the frames of a Python traceback that are in the code that was run, `<exec>`, each with its line:
 * Pyodide's own frames tell a student nothing.
 */
export function formatError(error: unknown, code: string) {
  const message = error instanceof Error ? error.message : String(error)
  if (!message.startsWith('Traceback')) return message
  const source = code.split('\n')
  const traceback = message.trimEnd().split('\n')
  const lines: string[] = []
  let inCode = true
  traceback.forEach((line, i) => {
    const frame = line.match(/^ {2}File "(.*)", line (\d+)/)
    if (frame) {
      inCode = frame[1] === '<exec>'
      if (!inCode) return
      lines.push(line)
      // A syntax error shows its line, with a caret under it; other frames of the code don't.
      if (!traceback[i + 1]?.startsWith('    ')) {
        lines.push(`    ${source[Number(frame[2]) - 1]?.trim() ?? ''}`)
      }
    } else if (!line.startsWith('    ') || inCode) {
      lines.push(line)
    }
  })
  return lines.join('\n')
}
