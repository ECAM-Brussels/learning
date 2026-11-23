import { Board } from '@learning/components'
import { createMemo, createSignal } from 'solid-js'

/**
 * A vector x from the origin, with a draggable head,
 * and the line span(x) that it generates.
 */
export function SpanOfVector() {
  const [head, setHead] = createSignal<[number, number]>([2, 1], { name: 'spanOfVectorHead' })

  // Place the label on the line
  // and slightly off the line so that it does not overlap it.
  const labelPosition = createMemo(
    (): [number, number] => {
      const [x, y] = head()
      const length = Math.hypot(x, y) || 1
      const [ux, uy] = [x / length, y / length]
      return [4.5 * ux + 0.5 * uy, 4.5 * uy - 0.5 * ux]
    },
    { name: 'spanOfVectorLabelPosition' },
  )

  return (
    <Board axis boundingBox={[-5.5, 5, 5.5, -5]} class="h-96 w-96">
      <Board.Line points={[[0, 0], head()]} color="#94a3b8" dash={2} fixed />
      <Board.Text
        position={labelPosition()}
        content="\mathrm{span}(\mathbf{x})"
        anchorX="middle"
        anchorY="middle"
        color="#64748b"
        fixed
      />
      <Board.Arrow from={[0, 0]} to={head()} color="#0369a1" strokeWidth={3} fixed />
      <Board.Point
        position={head()}
        name="\mathbf{x}"
        color="#0369a1"
        onDrag={(point) => setHead([point.X(), point.Y()])}
      />
    </Board>
  )
}
