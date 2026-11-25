import { Board } from '@learning/components'
import type { JSX } from '@solidjs/web'
import { createMemo, createSignal } from 'solid-js'

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
  const { x1, x2, alpha, beta } = LINEAR_COMBINATION_3D
  const alphaX1 = x1.map((c) => alpha * c) as Vec3
  const betaX2 = x2.map((c) => beta * c) as Vec3
  const x3: Vec3 = [alphaX1[0] + betaX2[0], alphaX1[1] + betaX2[1], alphaX1[2] + betaX2[2]]

  const side = (from: Vec3, to: Vec3, color: string, arrow: boolean) => (
    <Board.Vector3D
      from={from}
      to={to}
      strokeColor={color}
      strokeWidth={2}
      dash={2}
      lastArrow={arrow}
    />
  )

  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      {/* Created before the view, so that the view's labels are drawn over it. */}
      <Board.Text
        position={[-7.4, 7.2]}
        content={coefficientsTeX(alpha, beta)}
        anchorX="left"
        anchorY="middle"
        fontSize={COEFFICIENT_FONT_SIZE}
        fixed
      />
      {/* The vectors point mostly upwards (z from -0.3 to 2.1), so the origin is placed low in the box. */}
      <View3D zRange={[-1.5, 4.5]}>
        <ClippedPlane u={x1} v={x2} />
        {side([0, 0, 0], alphaX1, X1_COLOR, true)}
        {side([0, 0, 0], betaX2, X2_COLOR, true)}
        {side(betaX2, x3, X1_COLOR, false)}
        {side(alphaX1, x3, X2_COLOR, false)}
        <Arrow3D to={x1} color={X1_COLOR} />
        <Arrow3D to={x2} color={X2_COLOR} />
        <Arrow3D to={x3} color={X3_COLOR} />
        <VectorName3D position={x1} tex="\mathbf{x_1}" color={X1_COLOR} />
        {/* Beside the tip rather than above it, where the dashed beta x2 continues. */}
        <VectorName3D position={x2} tex="\mathbf{x_2}" color={X2_COLOR} toTheRight />
        <VectorName3D position={x3} tex="\mathbf{x_3}" color={X3_COLOR} />
        <VectorName3D position={alphaX1} tex="\alpha\mathbf{x_1}" color={X1_COLOR} />
        <VectorName3D position={betaX2} tex="\beta\mathbf{x_2}" color={X2_COLOR} />
      </View3D>
    </Board>
  )
}

type Vec3 = [number, number, number]

const LINEAR_COMBINATION_3D = {
  // With the default camera (az = 1, el = 0.3), the viewing direction is about (0.80, 0.52, 0.30):
  // the plane span(x1, x2) faces it within about 16 degrees, so it is seen almost head-on.
  // x1 is not perpendicular to x2 (about 64 degrees) and is about 1.7 times as long.
  x1: [-1.2, 2.3, 0.3] as Vec3,
  x2: [-0.3, 0.4, 1.4] as Vec3,
  alpha: -1,
  beta: 1.5,
}

/**
 * Two vectors x and y from the origin, with draggable heads,
 * and the plane span(x, y) that they generate.
 */
export function SpanOfTwoVectors() {
  const [x, setX] = createSignal<Vec3>([2, -1, 0.5], { name: 'spanOfTwoVectorsX' })
  const [y, setY] = createSignal<Vec3>([0.5, 2, 1.5], { name: 'spanOfTwoVectorsY' })

  // The label lies in the plane, at 0.9 (x + y), between the two arrows.
  // It is pulled back towards the origin when needed, to stay inside the box [-3, 3]^3.
  const labelPosition = createMemo(
    (): Vec3 => {
      const sum = [0, 1, 2].map((i) => x()[i]! + y()[i]!)
      const scale = Math.min(-0.8, 2.7 / (Math.max(...sum.map(Math.abs)) || 1))
      return sum.map((c) => scale * c) as Vec3
    },
    { name: 'spanOfTwoVectorsLabelPosition' },
  )

  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <View3D>
        <Board.Point3D
          position={x()}
          onDrag={(point) => setX(coordinates(point))}
          {...vectorHead('\\mathbf{x}', '#0369a1', [10, 18])}
        />
        <Board.Point3D
          position={y()}
          onDrag={(point) => setY(coordinates(point))}
          {...vectorHead('\\mathbf{y}', '#b45309')}
        />
        <PlaneSpan x={x()} y={y()} />
        <SpanLabel3D position={labelPosition()} tex="\mathrm{span}(\mathbf{x},\mathbf{y})" />
      </View3D>
    </Board>
  )
}

/**
 * Two parallel vectors x and y = -1.25 x from the origin,
 * and the line span(x) = span(y) that they generate.
 */
export function SpanOfParallelVectors() {
  // With the default camera (az = 1, el = 0.3, parallel projection), x is almost
  // perpendicular to the viewing direction, so it is seen without foreshortening,
  // and x and y point between the drawn axes rather than along them.
  const x: Vec3 = [-1, 0.5, 1.5]
  const y = x.map((c) => -1.25 * c) as Vec3

  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <View3D>
        <Board.Vector3D
          from={[0, 0, 0]}
          to={x}
          lastArrow={false}
          straightFirst
          straightLast
          strokeColor={SPAN_LABEL_COLOR}
          strokeWidth={2}
          dash={2}
        />
        <SpanLabel3D position={x.map((c) => 1.6 * c) as Vec3} tex="\mathrm{span}(\mathbf{x})" />
        <Arrow3D to={x} color="#0369a1" />
        <Arrow3D to={y} color="#b45309" />
        {/* Invisible points (size 0) that only carry the names just above the arrowheads. */}
        <Board.Point3D position={x} {...vectorName('\\mathbf{x}', [-10, 4])} />
        <Board.Point3D position={y} {...vectorName('\\mathbf{y}', [-10, 10])} />
      </View3D>
    </Board>
  )
}

/**
 * Two linearly independent vectors x and y from the origin,
 * and the plane span(x, y) that they generate.
 */
export function SpanOfIndependentVectors() {
  const x: Vec3 = [1.6, -0.8, 0.6]
  const y: Vec3 = [0.5, 2, 1.5]

  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      <View3D>
        {/* Invisible heads (size 0) that only carry the names just above the arrowheads. */}
        <Board.Point3D position={x} {...vectorName('\\mathbf{x}', [-10, 4])} />
        <Board.Point3D position={y} {...vectorName('\\mathbf{y}', [-10, 5])} />
        <PlaneSpan x={x} y={y} />
        <SpanLabel3D position={[2.1, 1.2, 2.1]} tex="\mathrm{span}(\mathbf{x},\mathbf{y})" />
      </View3D>
    </Board>
  )
}

/**
 * Three linearly independent vectors in space:
 * the same x1 and x2 as in LinearCombination3D, and x3 outside their plane.
 */
export function IndependentVectors3D() {
  const { x1, x2 } = LINEAR_COMBINATION_3D
  // x3 is about 0.39 x1 + 0.86 x2 + 3 n, where n is the unit normal to the plane.
  // Its projection onto the plane is deliberately on neither span(x1) nor span(x2).
  const x3: Vec3 = [1.9, 2.6, 1.5]
  const foot = projectOntoPlane(x3, x1, x2)

  return (
    <Board boundingBox={[-8, 8, 8, -8]} class="h-120 w-120">
      {/* Created before the view, so that the view's labels are drawn over it. */}
      <Board.Text
        position={[-7.4, 7.2]}
        content={`{\\color{${X3_COLOR}}\\mathbf{x_3}} \\notin \\mathrm{span}(\\mathbf{x_1},\\mathbf{x_2})`}
        anchorX="left"
        anchorY="middle"
        fontSize={COEFFICIENT_FONT_SIZE}
        fixed
      />
      {/* Seen from higher up than the other figures (el = 0.9 instead of 0.3),
          the plane, which is nearly vertical, is tilted by about 50 degrees,
          so the dashed line from x3 to the plane is long and x3 visibly sticks out below it. */}
      <View3D zRange={[-1.5, 4.5]} camera={{ az: 1.08, el: 0.9 }}>
        <ClippedPlane u={x1} v={x2} />
        <Arrow3D to={x1} color={X1_COLOR} />
        <Arrow3D to={x2} color={X2_COLOR} />
        <Arrow3D to={x3} color={X3_COLOR} />
        <Board.Vector3D
          from={x3}
          to={foot}
          lastArrow={false}
          strokeColor={X3_COLOR}
          strokeWidth={2}
          dash={2}
        />
        <Board.Point3D
          position={foot}
          name=""
          size={3}
          fixed
          fillColor={X3_COLOR}
          strokeColor={X3_COLOR}
        />
        <VectorName3D position={x1} tex="\mathbf{x_1}" color={X1_COLOR} />
        <VectorName3D position={x2} tex="\mathbf{x_2}" color={X2_COLOR} toTheRight />
        {/* Beside the tip rather than above it, where the dashed projection line goes. */}
        <VectorName3D position={x3} tex="\mathbf{x_3}" color={X3_COLOR} toTheRight />
      </View3D>
    </Board>
  )
}

// az and el are JSXGraph's camera angles (in radians); 1 and 0.3 are its defaults.
function View3D(props: {
  zRange?: [number, number]
  camera?: { az: number; el: number }
  children: JSX.Element
}) {
  return (
    <Board.View3D
      position={[-6, -3]}
      size={[12, 10]}
      bounds={[[-3, 3], [-3, 3], props.zRange ?? [-3, 3]]}
      depthOrder={{ enabled: true }}
      az={{ slider: { start: props.camera?.az ?? 1 } }}
      el={{ slider: { start: props.camera?.el ?? 0.3 } }}
      xAxis={{ name: 'x' }}
      yAxis={{ name: 'y' }}
      zAxis={{ name: 'z' }}
      xPlaneRear={{ fillOpacity: 0.1 }}
      yPlaneRear={{ fillOpacity: 0.1 }}
      zPlaneRear={{ fillOpacity: 0.1 }}
    >
      {props.children}
    </Board.View3D>
  )
}

const coordinates = (point: JXG.Point3D): Vec3 => [point.X(), point.Y(), point.Z()]

// labelOffset is in pixels; [10, 10] is JSXGraph's default.
function vectorHead(
  name: string,
  color: string,
  labelOffset: [number, number] = [10, 10],
): JXG.Point3DAttributes {
  return { name, size: 5, fillColor: color, strokeColor: color, label: { offset: labelOffset } }
}

// An invisible point (size 0) at an arrowhead that only carries the vector's name,
// placed with a pixel offset from the arrowhead.
function vectorName(name: string, offset: [number, number]): JXG.Point3DAttributes {
  return { name, size: 0, fixed: true, label: { offset, anchorX: 'middle', anchorY: 'bottom' } }
}

function Arrow3D(props: { to: Vec3; color: string }) {
  return <Board.Vector3D from={[0, 0, 0]} to={props.to} strokeColor={props.color} strokeWidth={3} />
}

// An invisible point (size 0) that only carries the name of a span.
function SpanLabel3D(props: { position: Vec3; tex: string }) {
  return (
    <Board.Point3D
      position={props.position}
      name={props.tex}
      size={0}
      fixed
      label={{ strokeColor: SPAN_LABEL_COLOR }}
    />
  )
}

// The plane span(x, y), and the arrows x and y.
function PlaneSpan(props: { x: Vec3; y: Vec3 }) {
  return (
    <>
      <Board.Plane3D
        point={[0, 0, 0]}
        directions={[props.x, props.y]}
        fillColor={SPAN_COLOR}
        fillOpacity={0.25}
        strokeColor={SPAN_LABEL_COLOR}
      />
      <Arrow3D to={props.x} color="#0369a1" />
      <Arrow3D to={props.y} color="#b45309" />
    </>
  )
}

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
function ClippedPlane(props: { u: Vec3; v: Vec3 }) {
  return (
    <Board.Polygon3D
      points={clipPlane(props.u, props.v, [
        [-3, 3],
        [-3, 3],
        [-1.5, 3.5],
      ])}
      fillColor={SPAN_COLOR}
      fillOpacity={0.2}
      vertices={{ visible: false }}
      borders={{ strokeColor: SPAN_LABEL_COLOR, strokeWidth: 1 }}
    />
  )
}

// An invisible point at `position` that only carries a coloured name,
// above it or, with toTheRight, beside it.
function VectorName3D(props: { position: Vec3; tex: string; color: string; toTheRight?: boolean }) {
  return (
    <Board.Point3D
      position={props.position}
      name={props.tex}
      size={0}
      fixed
      label={{
        offset: props.toTheRight ? [12, 0] : [0, 8],
        anchorX: props.toTheRight ? 'left' : 'middle',
        anchorY: props.toTheRight ? 'middle' : 'bottom',
        strokeColor: props.color,
        fontSize: LABEL_FONT_SIZE,
      }}
    />
  )
}

// The orthogonal projection of p onto the plane span(u, v).
function projectOntoPlane(p: Vec3, u: Vec3, v: Vec3): Vec3 {
  const n: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const k = dot(p, n) / dot(n, n)
  return [p[0] - k * n[0], p[1] - k * n[1], p[2] - k * n[2]]
}
