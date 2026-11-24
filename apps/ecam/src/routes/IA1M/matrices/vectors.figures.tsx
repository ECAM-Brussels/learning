import { Board, BoardContext } from '@learning/components'
import { createMemo, createSignal, onSettled, useContext } from 'solid-js'

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
      <Board.Point
        position={head()}
        name="\mathbf{x}"
        color="#0369a1"
        onDrag={(point) => setHead([point.X(), point.Y()])}
      />
      <Board.Arrow from={[0, 0]} to={head()} color="#0369a1" strokeWidth={3} fixed />
      <Board.Line points={[[0, 0], head()]} color="#94a3b8" dash={2} fixed />
      <Board.Text
        position={labelPosition()}
        content="\mathrm{span}(\mathbf{x})"
        anchorX="middle"
        anchorY="middle"
        color="#64748b"
        fixed
      />
    </Board>
  )
}

/**
 * Two parallel vectors x and y = 2 x in the plane,
 * and the line span(x) = span(y) that they generate.
 */
export function SpanOfParallelVectors2D() {
  const x: [number, number] = [2, 1]
  const y: [number, number] = [2 * x[0], 2 * x[1]]
  const [ux, uy] = [x[0] / Math.hypot(...x), x[1] / Math.hypot(...x)]

  return (
    <Board axis boundingBox={[-0.5, 5, 5.5, -0.5]} class="h-120 w-120">
      <Board.Line points={[[0, 0], x]} color="#94a3b8" dash={2} fixed />
      <Board.Text
        position={[6 * ux - 0.6 * uy, 6 * uy + 0.3 * ux]}
        content="\mathrm{span}(\mathbf{x})"
        anchorX="middle"
        anchorY="middle"
        color="#64748b"
        fixed
      />
      <Board.Arrow from={[0, 0]} to={x} color="#0369a1" strokeWidth={3} fixed />
      <Board.Arrow from={[0, 0]} to={y} color="#b45309" strokeWidth={2} fixed />
      <Board.Point
        position={x}
        name="\mathbf{x}"
        color="#0369a1"
        label={{ offset: [0, 8], anchorX: 'middle', anchorY: 'bottom' }}
        fixed
      />
      <Board.Point
        position={y}
        name="\mathbf{y}"
        color="#b45309"
        label={{ offset: [0, 8], anchorX: 'middle', anchorY: 'bottom' }}
        fixed
      />
    </Board>
  )
}

/**
 * Two linearly independent vectors x and y in the plane,
 * whose span is the whole plane.
 */
export function SpanOfIndependentVectors2D() {
  const x: [number, number] = [2, 1]
  const y: [number, number] = [1, 3]

  return (
    <Board axis boundingBox={[-0.5, 5, 5.5, -0.5]} class="h-120 w-120">
      <Board.Polygon
        points={[
          [-0.5, -0.5],
          [5.5, -0.5],
          [5.5, 5],
          [-0.5, 5],
        ]}
        fillColor="#94a3b8"
        fillOpacity={0.25}
        vertices={{ visible: false }}
        borders={{ visible: false }}
        highlight={false}
        fixed
      />
      <Board.Text
        position={[4, 4.4]}
        content="\mathrm{span}(\mathbf{x},\mathbf{y})=\mathbb{R}^2"
        anchorX="middle"
        anchorY="middle"
        color="#64748b"
        fixed
      />
      <Board.Arrow from={[0, 0]} to={x} color="#0369a1" strokeWidth={3} fixed />
      <Board.Arrow from={[0, 0]} to={y} color="#b45309" strokeWidth={3} fixed />
      <Board.Point
        position={x}
        name="\mathbf{x}"
        color="#0369a1"
        label={{ offset: [8, 0], anchorX: 'left', anchorY: 'middle' }}
        fixed
      />
      <Board.Point
        position={y}
        name="\mathbf{y}"
        color="#b45309"
        label={{ offset: [0, 8], anchorX: 'middle', anchorY: 'bottom' }}
        fixed
      />
    </Board>
  )
}

/**
 * Two vectors x and y from the origin, with draggable heads,
 * and the plane span(x, y) that they generate.
 */
export function SpanOfTwoVectors() {
  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <SpanOfTwoVectorsView />
    </Board>
  )
}

/**
 * Two parallel vectors x and y = -1.25 x from the origin,
 * and the line span(x) = span(y) that they generate.
 */
export function SpanOfParallelVectors() {
  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <SpanOfParallelVectorsView />
    </Board>
  )
}

/**
 * Two linearly independent vectors x and y from the origin,
 * and the plane span(x, y) that they generate.
 */
export function SpanOfIndependentVectors() {
  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <SpanOfIndependentVectorsView />
    </Board>
  )
}

// Board.tsx has no 3D components yet, so the 3D views below are built imperatively.
function createView3D(board: JXG.Board) {
  return board.create(
    'view3d',
    [
      [-6, -3],
      [12, 10],
      [
        [-3, 3],
        [-3, 3],
        [-3, 3],
      ],
    ],
    {
      depthOrder: { enabled: true },
      xPlaneRear: { fillOpacity: 0.1 },
      yPlaneRear: { fillOpacity: 0.1 },
      zPlaneRear: { fillOpacity: 0.1 },
    },
  ) as JXG.View3D
}

// The typings omit point attributes such as size from Point3DAttributes,
// although point3d accepts them.
function vectorHead(name: string, color: string, fixed = false): JXG.PointAttributes {
  return { name, size: 5, fillColor: color, strokeColor: color, fixed }
}

function createArrow3D(
  view: JXG.View3D,
  head: [number, number, number] | JXG.Point3D,
  color: string,
) {
  view.create('line3d', [[0, 0, 0], head], {
    strokeColor: color,
    strokeWidth: 3,
    lastArrow: true,
  })
}

// JSXGraph's own dependency graph keeps the arrows and the plane in sync with the dragged heads,
// which is why no Solid signal is needed here.
function SpanOfTwoVectorsView() {
  const board = useContext(BoardContext)

  onSettled(() => {
    const view = createView3D(board()!)
    const x = view.create('point3d', [2, -1, 0.5], vectorHead('\\mathbf{x}', '#0369a1'))
    const y = view.create('point3d', [0.5, 2, 1.5], vectorHead('\\mathbf{y}', '#b45309'))

    createPlaneSpan(view, x, y)
  })

  return null
}

function SpanOfIndependentVectorsView() {
  const board = useContext(BoardContext)

  onSettled(() => {
    const view = createView3D(board()!)
    const x = view.create('point3d', [1.6, -0.8, 0.6], vectorHead('\\mathbf{x}', '#0369a1', true))
    const y = view.create('point3d', [0.5, 2, 1.5], vectorHead('\\mathbf{y}', '#b45309', true))
    createPlaneSpan(view, x, y)
    view.create('point3d', [2.1, 1.2, 2.1], {
      name: '\\mathrm{span}(\\mathbf{x},\\mathbf{y})',
      size: 0,
      fixed: true,
      label: { strokeColor: '#64748b' },
    } as JXG.PointAttributes)
  })

  return null
}

function createPlaneSpan(view: JXG.View3D, x: JXG.Point3D, y: JXG.Point3D) {
  view.create(
    'plane3d',
    [
      [0, 0, 0],
      () => [x.X(), x.Y(), x.Z()],
      () => [y.X(), y.Y(), y.Z()],
      [-Infinity, Infinity],
      [-Infinity, Infinity],
    ],
    {
      fillColor: '#94a3b8',
      fillOpacity: 0.35,
      strokeColor: '#64748b',
    },
  )
  createArrow3D(view, x, '#0369a1')
  createArrow3D(view, y, '#b45309')
}

function SpanOfParallelVectorsView() {
  const board = useContext(BoardContext)

  onSettled(() => {
    const view = createView3D(board()!)
    const x: [number, number, number] = [1.6, -0.8, 0.6]
    const y = x.map((c) => -1.25 * c) as [number, number, number]

    view.create('line3d', [[0, 0, 0], x], {
      straightFirst: true,
      straightLast: true,
      strokeColor: '#64748b',
      strokeWidth: 2,
      dash: 2,
    })
    view.create(
      'point3d',
      x.map((c) => 1.6 * c),
      {
        name: '\\mathrm{span}(\\mathbf{x})',
        size: 0,
        fixed: true,
        label: { strokeColor: '#64748b' },
      } as JXG.PointAttributes,
    )

    createArrow3D(view, x, '#0369a1')
    createArrow3D(view, y, '#b45309')
    view.create('point3d', x, vectorHead('\\mathbf{x}', '#0369a1', true))
    view.create('point3d', y, vectorHead('\\mathbf{y}', '#b45309', true))
  })

  return null
}
