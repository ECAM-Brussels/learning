/// <reference lib="webworker" />

import dedent from 'dedent'
import { loadPyodide, version as pyodideVersion } from 'pyodide'
import type { Input, Output } from '..'

let loading = true
let pyodidePromise: ReturnType<typeof loadPyodide> | null = null

function initPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
      packages: ['sympy'],
    })
  }
}

self.onmessage = async (event: MessageEvent<Input>) => {
  initPyodide()
  const pyodide = await pyodidePromise!
  self.postMessage({ status: 'ready' })
  loading = false
  let output: Output = { id: event.data.id }
  try {
    pyodide.runPython(dedent`
      import sys
      from io import StringIO
      stdout_capture = StringIO()
      sys.stdout = stdout_capture
    `)
    output.result = pyodide.runPython(event.data.code)
    output.stdout = pyodide.runPython('sys.stdout.getvalue()')
  } catch (error) {
    output.error = (error as any).message
  } finally {
    self.postMessage(output)
  }
}
