import { Python } from '@learning/components/src/Python'
import Exercise from '@learning/exercises'
import { createSignal, type Component } from 'solid-js'
import './style.css'

const App: Component = () => {
  const [data, setData] = createSignal({
    name: 'math/factor' as const,
    question: { expr: '(x + {a})(x + {b})' },
    params: {
      a: [1, 2, 3],
      b: [1, 2, 3],
    },
    attempt: [],
  })
  const [code, setCode] = createSignal('import time\ntime.sleep(1)\nprint("Hello, world!")')
  return (
    <div class="container mx-auto">
      <textarea value={code()} onInput={(e) => setCode(e.target.value)} class="w-full border" />
      <Python value={code()} />
      <Exercise fetch={data} save={setData} />
    </div>
  )
}

export default App
