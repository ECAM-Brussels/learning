import Python from '@learning/components/Python'
import Exercise from '@learning/exercises'
import { createSignal, Loading, type Component } from 'solid-js'
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
  const [code, setCode] = createSignal('print("Hello world")')
  return (
    <Loading>
      <div class="container mx-auto">
        <textarea value={code()} onInput={(e) => setCode(e.target.value)} class="w-full border" />
        <Python value={code()} math />
        <Exercise fetch={data} save={setData} />
      </div>
    </Loading>
  )
}

export default App
