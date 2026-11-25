import { Board, BoardContext } from '@learning/components'
import { createMemo, createSignal, onSettled, useContext } from 'solid-js'

// The span (lines, planes and their labels) is drawn in a muted green,
// distinct from the blue of x and the amber of y.
const SPAN_COLOR = '#10b981'
const SPAN_LABEL_COLOR = '#047857'

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
      <Board.Line points={[[0, 0], head()]} color={SPAN_COLOR} dash={2} fixed />
      <Board.Text
        position={labelPosition()}
        content="\mathrm{span}(\mathbf{x})"
        anchorX="middle"
        anchorY="middle"
        color={SPAN_LABEL_COLOR}
        fixed
      />
      <Board.Point
        position={head()}
        name="\mathbf{x}"
        color="#0369a1"
        onDrag={(point) => setHead([point.X(), point.Y()])}
      />
      <Board.Arrow from={[0, 0]} to={head()} color="#0369a1" strokeWidth={3} fixed />
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
    <Board axis boundingBox={[-1.2, 5.6, 6.2, -1.2]} class="h-120 w-120">
      <Board.Line points={[[0, 0], x]} color={SPAN_COLOR} dash={2} fixed />
      <Board.Text
        position={[6 * ux - 0.6 * uy, 6 * uy + 0.3 * ux]}
        content="\mathrm{span}(\mathbf{x})"
        anchorX="middle"
        anchorY="middle"
        color={SPAN_LABEL_COLOR}
        fixed
      />
      <Board.Arrow from={[0, 0]} to={x} color="#0369a1" strokeWidth={3} fixed />
      <Board.Arrow from={[0, 0]} to={y} color="#b45309" strokeWidth={2} fixed />
      {/* Labels just above the arrowheads (JSXGraph texts are black by default). */}
      <Board.Text
        position={[x[0] - 0.2, x[1] + 0.05]}
        content="\mathbf{x}"
        anchorX="middle"
        anchorY="bottom"
        fixed
      />
      <Board.Text
        position={[y[0] - 0.2, y[1] + 0.05]}
        content="\mathbf{y}"
        anchorX="middle"
        anchorY="bottom"
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
        fillColor={SPAN_COLOR}
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
        color={SPAN_LABEL_COLOR}
        fixed
      />
      <Board.Arrow from={[0, 0]} to={x} color="#0369a1" strokeWidth={3} fixed />
      <Board.Arrow from={[0, 0]} to={y} color="#b45309" strokeWidth={3} fixed />
      {/* Labels just above the arrowheads (JSXGraph texts are black by default). */}
      <Board.Text
        position={[x[0] - 0.2, x[1] + 0.05]}
        content="\mathbf{x}"
        anchorX="middle"
        anchorY="bottom"
        fixed
      />
      <Board.Text
        position={[y[0] - 0.2, y[1] - 0.05]}
        content="\mathbf{y}"
        anchorX="middle"
        anchorY="bottom"
        fixed
      />
    </Board>
  )
}

const X1_COLOR = '#0369a1'
const X2_COLOR = '#b45309'
const X3_COLOR = '#7c3aed'
const COEFFICIENT_FONT_SIZE = 22
const LABEL_FONT_SIZE = 16

type Vec2 = [number, number]

// A point at fraction t along the segment [from, to],
// shifted by `distance` to its left (side = 1) or to its right (side = -1).
function besideSegment(from: Vec2, to: Vec2, t: number, side: 1 | -1, distance = 0.35): Vec2 {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]]
  const length = Math.hypot(dx, dy) || 1
  return [
    from[0] + t * dx - (side * distance * dy) / length,
    from[1] + t * dy + (side * distance * dx) / length,
  ]
}

function coefficientsTeX(alpha: number, beta: number) {
  return `{\\color{${X1_COLOR}}\\alpha = ${alpha}},\\quad {\\color{${X2_COLOR}}\\beta = ${beta}}`
}

/**
 * Three linearly dependent vectors in the plane, x3 = 1.5 x1 + 2 x2,
 * with the parallelogram built on alpha x1 and beta x2, whose diagonal is x3.
 */
export function LinearCombination2D() {
  const x1: Vec2 = [2, 0.5]
  const x2: Vec2 = [0.5, 1.5]
  const [alpha, beta] = [1.5, 2]
  const alphaX1: Vec2 = [alpha * x1[0], alpha * x1[1]]
  const betaX2: Vec2 = [beta * x2[0], beta * x2[1]]
  const x3: Vec2 = [alphaX1[0] + betaX2[0], alphaX1[1] + betaX2[1]]

  const label = (position: Vec2, content: string, color?: string) => (
    <Board.Text
      position={position}
      content={content}
      anchorX="middle"
      anchorY="middle"
      color={color}
      fontSize={LABEL_FONT_SIZE}
      fixed
    />
  )

  return (
    <Board axis boundingBox={[-0.8, 4.6, 4.8, -1]} class="h-120 w-120">
      <Board.Polygon
        points={[[0, 0], alphaX1, x3, betaX2]}
        fillColor={X3_COLOR}
        fillOpacity={0.08}
        vertices={{ visible: false }}
        borders={{ visible: false }}
        highlight={false}
        fixed
      />
      {/* The sides of the parallelogram, dashed: alpha x1 and beta x2 from the origin,
          and their translates ending at x3. */}
      <Board.Arrow from={[0, 0]} to={alphaX1} color={X1_COLOR} strokeWidth={2} dash={2} fixed />
      <Board.Arrow from={[0, 0]} to={betaX2} color={X2_COLOR} strokeWidth={2} dash={2} fixed />
      <Board.Arrow from={betaX2} to={x3} color={X1_COLOR} strokeWidth={2} dash={2} fixed />
      <Board.Arrow from={alphaX1} to={x3} color={X2_COLOR} strokeWidth={2} dash={2} fixed />
      <Board.Arrow from={[0, 0]} to={x1} color={X1_COLOR} strokeWidth={3} fixed />
      <Board.Arrow from={[0, 0]} to={x2} color={X2_COLOR} strokeWidth={3} fixed />
      <Board.Arrow from={[0, 0]} to={x3} color={X3_COLOR} strokeWidth={3} fixed />
      {/* Labels away from the axes and from the dashed sides that extend x1 and x2. */}
      {label([1.85, 0.85], '\\mathbf{x_1}', X1_COLOR)}
      {label([0.85, 1.4], '\\mathbf{x_2}', X2_COLOR)}
      {label(besideSegment([0, 0], x3, 0.55, -1), '\\mathbf{x_3}', X3_COLOR)}
      {label([3.15, 0.4], '\\alpha\\mathbf{x_1}', X1_COLOR)}
      {label([0.55, 3.1], '\\beta\\mathbf{x_2}', X2_COLOR)}
      <Board.Text
        position={[1.3, 4.25]}
        content={coefficientsTeX(alpha, beta)}
        anchorX="left"
        anchorY="middle"
        fontSize={COEFFICIENT_FONT_SIZE}
        fixed
      />
    </Board>
  )
}

/**
 * Three linearly dependent vectors in space, x3 = -x1 + 1.5 x2:
 * they lie in the same plane span(x1, x2), and x3 is the diagonal of the parallelogram
 * built on alpha x1 and beta x2.
 */
export function LinearCombination3D() {
  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <LinearCombination3DView />
      <Board.Text
        position={[-7.4, 7.2]}
        content={coefficientsTeX(LINEAR_COMBINATION_3D.alpha, LINEAR_COMBINATION_3D.beta)}
        anchorX="left"
        anchorY="middle"
        fontSize={COEFFICIENT_FONT_SIZE}
        fixed
      />
    </Board>
  )
}

const LINEAR_COMBINATION_3D = {
  // With the default camera (az = 1, el = 0.3), the viewing direction is about (0.80, 0.52, 0.30):
  // the plane span(x1, x2) faces it within about 16 degrees, so it is seen almost head-on.
  // x1 is not perpendicular to x2 (about 64 degrees) and is about 1.7 times as long.
  x1: [-1.2, 2.3, 0.3] as [number, number, number],
  x2: [-0.3, 0.4, 1.4] as [number, number, number],
  alpha: -1,
  beta: 1.5,
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
// az and el are JSXGraph's camera angles (in radians); 1 and 0.3 are its defaults.
function createView3D(
  board: JXG.Board,
  zRange: [number, number] = [-3, 3],
  camera = { az: 1, el: 0.3 },
) {
  return board.create(
    'view3d',
    [
      [-6, -3],
      [12, 10],
      [[-3, 3], [-3, 3], zRange],
    ],
    {
      depthOrder: { enabled: true },
      az: { slider: { start: camera.az } },
      el: { slider: { start: camera.el } },
      xAxis: { name: 'x' },
      yAxis: { name: 'y' },
      zAxis: { name: 'z' },
      xPlaneRear: { fillOpacity: 0.1 },
      yPlaneRear: { fillOpacity: 0.1 },
      zPlaneRear: { fillOpacity: 0.1 },
    },
  ) as JXG.View3D
}

// The typings omit point attributes such as size from Point3DAttributes,
// although point3d accepts them.
// labelOffset is in pixels; [10, 10] is JSXGraph's default.
function vectorHead(
  name: string,
  color: string,
  labelOffset: [number, number] = [10, 10],
): JXG.PointAttributes {
  return { name, size: 5, fillColor: color, strokeColor: color, label: { offset: labelOffset } }
}

// An invisible point (size 0) at an arrowhead that only carries the vector's name,
// placed with a pixel offset from the arrowhead.
function vectorName(name: string, offset: [number, number]): JXG.PointAttributes {
  return { name, size: 0, fixed: true, label: { offset, anchorX: 'middle', anchorY: 'bottom' } }
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
    const x = view.create('point3d', [2, -1, 0.5], vectorHead('\\mathbf{x}', '#0369a1', [10, 18]))
    const y = view.create('point3d', [0.5, 2, 1.5], vectorHead('\\mathbf{y}', '#b45309'))

    createPlaneSpan(view, x, y)

    // The label lies in the plane, at 0.9 (x + y), between the two arrows.
    // It is pulled back towards the origin when needed, to stay inside the box [-3, 3]^3.
    const labelPosition = () => {
      const sum = [x.X() + y.X(), x.Y() + y.Y(), x.Z() + y.Z()]
      const scale = Math.min(-0.8, 2.7 / (Math.max(...sum.map(Math.abs)) || 1))
      return sum.map((c) => scale * c)
    }
    view.create('point3d', [labelPosition], {
      name: '\\mathrm{span}(\\mathbf{x},\\mathbf{y})',
      size: 0,
      fixed: true,
      label: { strokeColor: SPAN_LABEL_COLOR },
    } as JXG.PointAttributes)
  })

  return null
}

function SpanOfIndependentVectorsView() {
  const board = useContext(BoardContext)

  onSettled(() => {
    const view = createView3D(board()!)
    // Invisible heads (size 0) that only carry the names just above the arrowheads.
    const x = view.create('point3d', [1.6, -0.8, 0.6], vectorName('\\mathbf{x}', [-10, 4]))
    const y = view.create('point3d', [0.5, 2, 1.5], vectorName('\\mathbf{y}', [-10, 5]))
    createPlaneSpan(view, x, y)
    view.create('point3d', [2.1, 1.2, 2.1], {
      name: '\\mathrm{span}(\\mathbf{x},\\mathbf{y})',
      size: 0,
      fixed: true,
      label: { strokeColor: SPAN_LABEL_COLOR },
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
      fillColor: SPAN_COLOR,
      fillOpacity: 0.25,
      strokeColor: SPAN_LABEL_COLOR,
    },
  )
  createArrow3D(view, x, '#0369a1')
  createArrow3D(view, y, '#b45309')
}

function SpanOfParallelVectorsView() {
  const board = useContext(BoardContext)

  onSettled(() => {
    const view = createView3D(board()!)
    // With the default camera (az = 1, el = 0.3, parallel projection), x is almost
    // perpendicular to the viewing direction, so it is seen without foreshortening,
    // and x and y point between the drawn axes rather than along them.
    const x: [number, number, number] = [-1, 0.5, 1.5]
    const y = x.map((c) => -1.25 * c) as [number, number, number]

    view.create('line3d', [[0, 0, 0], x], {
      straightFirst: true,
      straightLast: true,
      strokeColor: SPAN_LABEL_COLOR,
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
        label: { strokeColor: SPAN_LABEL_COLOR },
      } as JXG.PointAttributes,
    )

    createArrow3D(view, x, '#0369a1')
    createArrow3D(view, y, '#b45309')
    // Invisible points (size 0) that only carry the names just above the arrowheads.
    view.create('point3d', x, vectorName('\\mathbf{x}', [-10, 4]))
    view.create('point3d', y, vectorName('\\mathbf{y}', [-10, 10]))
  })

  return null
}

function LinearCombination3DView() {
  const board = useContext(BoardContext)

  onSettled(() => {
    // The vectors point mostly upwards (z from -0.3 to 2.1), so the origin is placed low in the box.
    const view = createView3D(board()!, [-1.5, 4.5])
    const { x1, x2, alpha, beta } = LINEAR_COMBINATION_3D
    const alphaX1 = x1.map((c) => alpha * c) as [number, number, number]
    const betaX2 = x2.map((c) => beta * c) as [number, number, number]
    const x3: [number, number, number] = [
      alphaX1[0] + betaX2[0],
      alphaX1[1] + betaX2[1],
      alphaX1[2] + betaX2[2],
    ]

    createClippedPlane(view, x1, x2)

    const side = (
      from: [number, number, number],
      to: [number, number, number],
      color: string,
      arrow: boolean,
    ) =>
      view.create('line3d', [from, to], {
        strokeColor: color,
        strokeWidth: 2,
        dash: 2,
        lastArrow: arrow,
      })
    side([0, 0, 0], alphaX1, X1_COLOR, true)
    side([0, 0, 0], betaX2, X2_COLOR, true)
    side(betaX2, x3, X1_COLOR, false)
    side(alphaX1, x3, X2_COLOR, false)

    createArrow3D(view, x1, X1_COLOR)
    createArrow3D(view, x2, X2_COLOR)
    createArrow3D(view, x3, X3_COLOR)

    createVectorName(view, x1, '\\mathbf{x_1}', X1_COLOR)
    // Beside the tip rather than above it, where the dashed beta x2 continues.
    createVectorName(view, x2, '\\mathbf{x_2}', X2_COLOR, true)
    createVectorName(view, x3, '\\mathbf{x_3}', X3_COLOR)
    createVectorName(view, alphaX1, '\\alpha\\mathbf{x_1}', X1_COLOR)
    createVectorName(view, betaX2, '\\beta\\mathbf{x_2}', X2_COLOR)
  })

  return null
}

type Vec3 = [number, number, number]

// The polygon cut out of the plane span(u, v) by the box `bounds`
// (Sutherland–Hodgman clipping of a large parallelogram against each face of the box).
function clipPlane(
  u: Vec3,
  v: Vec3,
  bounds: [[number, number], [number, number], [number, number]],
) {
  const far = 100
  let polygon: Vec3[] = [
    [-far, -far],
    [far, -far],
    [far, far],
    [-far, far],
  ].map(([s, t]) => [0, 1, 2].map((i) => s! * u[i]! + t! * v[i]!) as Vec3)

  bounds.forEach(([min, max], axis) => {
    for (const [limit, sign] of [
      [min, 1],
      [max, -1],
    ] as const) {
      const inside = (p: Vec3) => sign * (p[axis]! - limit) >= 0
      const clipped: Vec3[] = []
      polygon.forEach((p, i) => {
        const q = polygon[(i + 1) % polygon.length]!
        if (inside(p)) clipped.push(p)
        if (inside(p) !== inside(q)) {
          const k = (limit - p[axis]!) / (q[axis]! - p[axis]!)
          clipped.push(p.map((c, j) => c + k * (q[j]! - c)) as Vec3)
        }
      })
      polygon = clipped
    }
  })
  return polygon
}

// The plane span(u, v) clipped to the box, except at the top, where it stops at z = 3.5
// (below the box's 4.5) to stay clear of the text in the top-left corner.
function createClippedPlane(view: JXG.View3D, u: Vec3, v: Vec3) {
  view.create(
    'polygon3d',
    clipPlane(u, v, [
      [-3, 3],
      [-3, 3],
      [-1.5, 3.5],
    ]),
    {
      fillColor: SPAN_COLOR,
      fillOpacity: 0.2,
      vertices: { visible: false },
      borders: { strokeColor: SPAN_LABEL_COLOR, strokeWidth: 1 },
    } as JXG.Polygon3DAttributes,
  )
}

// An invisible point at `position` that only carries a coloured name,
// above it or, with toTheRight, beside it.
function createVectorName(
  view: JXG.View3D,
  position: Vec3,
  tex: string,
  color: string,
  toTheRight = false,
) {
  view.create('point3d', position, {
    name: tex,
    size: 0,
    fixed: true,
    label: {
      offset: toTheRight ? [12, 0] : [0, 8],
      anchorX: toTheRight ? 'left' : 'middle',
      anchorY: toTheRight ? 'middle' : 'bottom',
      strokeColor: color,
      fontSize: LABEL_FONT_SIZE,
    },
  } as JXG.PointAttributes)
}

/**
 * Three linearly independent vectors in space:
 * the same x1 and x2 as in LinearCombination3D, and x3 outside their plane.
 */
export function IndependentVectors3D() {
  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <IndependentVectors3DView />
      <Board.Text
        position={[-7.4, 7.2]}
        content={`{\\color{${X3_COLOR}}\\mathbf{x_3}} \\notin \\mathrm{span}(\\mathbf{x_1},\\mathbf{x_2})`}
        anchorX="left"
        anchorY="middle"
        fontSize={COEFFICIENT_FONT_SIZE}
        fixed
      />
    </Board>
  )
}

function IndependentVectors3DView() {
  const board = useContext(BoardContext)

  onSettled(() => {
    // Seen from higher up than the other figures (el = 0.9 instead of 0.3),
    // the plane, which is nearly vertical, is tilted by about 50 degrees,
    // so the dashed line from x3 to the plane is long and x3 visibly sticks out below it.
    const view = createView3D(board()!, [-1.5, 4.5], { az: 1.08, el: 0.9 })
    const { x1, x2 } = LINEAR_COMBINATION_3D
    // x3 is about 0.39 x1 + 0.86 x2 + 3 n, where n is the unit normal to the plane.
    // Its projection onto the plane is deliberately on neither span(x1) nor span(x2).
    const x3: Vec3 = [1.9, 2.6, 1.5]
    const foot = projectOntoPlane(x3, x1, x2)

    createClippedPlane(view, x1, x2)
    createArrow3D(view, x1, X1_COLOR)
    createArrow3D(view, x2, X2_COLOR)
    createArrow3D(view, x3, X3_COLOR)
    view.create('line3d', [x3, foot], {
      strokeColor: X3_COLOR,
      strokeWidth: 2,
      dash: 2,
    })
    view.create('point3d', foot, {
      name: '',
      size: 3,
      fixed: true,
      fillColor: X3_COLOR,
      strokeColor: X3_COLOR,
    } as JXG.PointAttributes)

    createVectorName(view, x1, '\\mathbf{x_1}', X1_COLOR)
    createVectorName(view, x2, '\\mathbf{x_2}', X2_COLOR, true)
    // Beside the tip rather than above it, where the dashed projection line goes.
    createVectorName(view, x3, '\\mathbf{x_3}', X3_COLOR, true)
  })

  return null
}

// The orthogonal projection of p onto the plane span(u, v).
function projectOntoPlane(p: Vec3, u: Vec3, v: Vec3): Vec3 {
  const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const k = dot(p, n) / dot(n, n)
  return [p[0] - k * n[0], p[1] - k * n[1], p[2] - k * n[2]]
}
