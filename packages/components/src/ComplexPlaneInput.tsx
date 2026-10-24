import { createMemo, merge } from 'solid-js'
import { Board } from './Board'

export function ComplexPlaneInput(rawProps: {
  grid?: boolean
  value?: [number, number]
  onChange?: (value: [number, number]) => void
  snapSize?: number
}) {
  const props = merge({ grid: true, value: [1, 0] as [number, number], snapSize: 1 }, rawProps)
  const attrs = createMemo(() => {
    return {
      snapSizeX: props.snapSize,
      snapSizeY: props.snapSize,
      snapToGrid: true,
    } satisfies Partial<JXG.PointAttributes>
  })
  return (
    <Board
      axis
      defaultAxes={
        props.grid
          ? {}
          : {
              x: {
                ticks: { majorHeight: 0, visible: false },
              },
              y: { ticks: { majorHeight: 0, visible: false } },
            }
      }
    >
      <Board.Point
        position={props.value}
        onDrag={(P) => props.onChange?.([P.X(), P.Y()])}
        showInfobox={false}
        label={{ visible: false }}
        {...attrs()}
      >
        {(P) => <Board.Arrow from={[0, 0]} to={P} fixed />}
      </Board.Point>
    </Board>
  )
}
