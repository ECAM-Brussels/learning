import { Board } from '@learning/components'
import { createMemo, createSignal } from 'solid-js'

export const Sine = () => (
  <Board axis boundingBox={[-7, 2, 7, -2]} class="h-100 w-150">
    <Board.Plot fn={Math.sin} />
    <Board.Point position={[Math.PI / 2, 1]} name="A" />
  </Board>
)

export function Parabola() {
  const [a, setA] = createSignal(1)
  const f = createMemo(() => {
    const k = a()
    return (x: number) => k * x * x
  })
  return (
    <Board axis boundingBox={[-5, 5, 5, -5]} class="h-125 w-125">
      <Board.Slider
        from={[-4, 4]}
        to={[0, 4]}
        min={-2}
        max={2}
        value={a()}
        onChange={setA}
        name="a"
      />
      <Board.Plot fn={f()} />
    </Board>
  )
}

export function Breathing() {
  const [t, setT] = createSignal(0)
  const [playing, setPlaying] = createSignal(true)
  const f = createMemo(() => {
    const a = Math.sin(t())
    return (x: number) => a * x * x
  })
  return (
    <>
      <Board
        axis
        boundingBox={[-5, 5, 5, -5]}
        class="h-125 w-125"
        onFrame={playing() ? (dt) => setT(t() + dt) : undefined}
      >
        <Board.Plot fn={f()} />
      </Board>
      <button
        class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
        onClick={() => setPlaying(!playing())}
      >
        {playing() ? 'Pause' : 'Animer'}
      </button>
    </>
  )
}
