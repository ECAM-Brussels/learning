/// <reference lib="webworker" />

import dedent from 'dedent'
import { loadPyodide, version as pyodideVersion } from 'pyodide'
import type { Input, Output } from '..'

let pyodidePromise: ReturnType<typeof loadPyodide> | null = null

function initPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
    })
  }
}

self.onmessage = async (event: MessageEvent<Input>) => {
  initPyodide()
  self.postMessage({ status: 'loading' })
  const pyodide = await pyodidePromise!
  self.postMessage({ status: 'importing' })
  await pyodide.loadPackagesFromImports(event.data.code)
  self.postMessage({ status: 'executing' })
  let output: Output = { id: event.data.id }
  try {
    pyodide.globals.clear()
    pyodide.runPython(dedent`
      import sys
      from io import StringIO
      stdout_capture = StringIO()
      sys.stdout = stdout_capture
    `)
    const result = pyodide.runPython(event.data.code)
    output.result = String(result ?? '')
    output.stdout = pyodide.runPython('sys.stdout.getvalue()')
    if (event.data.options?.math && result && result._repr_latex_ !== undefined) {
      output.result = result._repr_latex_().substr(1, result._repr_latex_().length - 2)
      output.format = 'latex'
    }
  } catch (error) {
    output.error = (error as any).message
  } finally {
    self.postMessage(output)
    self.postMessage({ status: 'ready' })
  }
}
