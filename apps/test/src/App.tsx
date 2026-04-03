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
  return (
    <>
      <Exercise fetch={data} save={setData} />
    </>
  )
}

export default App
