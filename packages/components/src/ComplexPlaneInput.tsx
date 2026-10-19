import { createMemo, merge } from 'solid-js'
import { Board, type Coordinate } from './Board'

export function ComplexPlaneInput(rawProps: {
  value?: [Coordinate, Coordinate]
  onChange?: (value: [number, number]) => void
  snapSize?: number
}) {
  const props = merge({ value: [1, 0] as [Coordinate, Coordinate], snapSize: 1 }, rawProps)
  const attrs = createMemo(() => {
    return {
      snapSizeX: props.snapSize,
      snapSizeY: props.snapSize,
      snapToGrid: true,
    } satisfies Partial<JXG.PointAttributes>
  })
  return (
    <Board axis>
      <Board.Point
        position={props.value}
        onDrag={(P) => props.onChange?.([P.X(), P.Y()])}
        {...attrs()}
      >
        {(P) => <Board.Arrow from={[0, 0]} to={P} fixed />}
      </Board.Point>
    </Board>
  )
}
