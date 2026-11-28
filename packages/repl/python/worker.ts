/// <reference lib="webworker" />

import { loadPyodide, version } from 'pyodide'
import type { Options } from '.'
import type { Input } from '../types'
import dualNumbers from './automatic_diff.py?raw'
import { createExecutor } from './execute'

const execute = createExecutor(
  () => loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/` }),
  dualNumbers,
)

self.onmessage = (event: MessageEvent<Input<Options>>) => {
  void execute(event.data, (output) => self.postMessage(output))
}
