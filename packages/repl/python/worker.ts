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
  self.postMessage({ id: event.data.id, status: 'loading' })
  initPyodide()
  const pyodide = await pyodidePromise!
  self.postMessage({ id: event.data.id, status: 'importing' })
  await pyodide.loadPackagesFromImports(event.data.code)
  self.postMessage({ id: event.data.id, status: 'executing' })
  let output: Output = { id: event.data.id }
  try {
    pyodide.globals.clear()
    if (event.data.options?.math && event.data.code.includes('matplotlib')) {
      pyodide.runPython(dedent`
        import os
        os.environ["MPLBACKEND"] = "AGG"
      `)
    }
    pyodide.runPython(dedent`
      import sys
      from io import StringIO
      stdout_capture = StringIO()
      sys.stdout = stdout_capture
    `)
    const result = pyodide.runPython(event.data.code)
    output.result = String(result ?? '')
    output.stdout = pyodide.runPython('sys.stdout.getvalue()')
    if (event.data.options?.math) {
      if (result && result._repr_latex_ !== undefined) {
        output.result = result._repr_latex_().substr(1, result._repr_latex_().length - 2)
        output.format = 'latex'
      } else if (event.data.code.includes('matplotlib')) {
        const image = pyodide.runPython(dedent`
          import base64
          import io
          import matplotlib.pyplot as plt

          buffer = io.BytesIO()
          plt.savefig(buffer, format='png')
          plt.close()
          buffer.seek(0)
          base64.b64encode(buffer.read()).decode('utf-8')
        `)
        output.result = `data:image/png;base64,${image}`
        output.format = 'image'
      }
    }
  } catch (error) {
    output.error = (error as any).message
  } finally {
    self.postMessage(output)
    self.postMessage({ status: 'ready' })
  }
}
