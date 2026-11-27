import { render, waitFor } from '@solidjs/testing-library'
import type { JSX } from '@solidjs/web'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createEffect, createMemo, createSignal, flush, Show } from 'solid-js'
import { drag } from './jsxgraphStubs'

const { Board, BoardDefaults } = await import('./Board')
const { Boundary } = await import('./Boundary')

type XY = { X(): number; Y(): number }
type XYZ = XY & { Z(): number }
// `+ 0` turns -0 into 0, which toEqual tells apart.
const xy = (p: XY) => [p.X() + 0, p.Y() + 0]
const xyz = (p: XYZ) => [p.X() + 0, p.Y() + 0, p.Z() + 0]
// Not in JSXGraph's types for every element that has it.
const value = (el: unknown) => (el as { Value(): number }).Value()
const slope = (line: unknown) => (line as { getSlope(): number }).getSlope()

async function renderBoard<T>(children: (ref: (el: T) => null) => JSX.Element) {
  let element: T | undefined
  const result = render(() => (
    <Board boundingBox={[-10, 10, 10, -10]}>{children((el) => ((element = el), null))}</Board>
  ))
  await waitFor(() => expect(element).toBeDefined())
  return { ...result, el: () => element! }
}

const bounds: [[number, number], [number, number], [number, number]] = [
  [-5, 5],
  [-5, 5],
  [-5, 5],
]

function renderView<T>(children: (ref: (el: T) => null) => JSX.Element) {
  return renderBoard<T>((ref) => (
    <Board.View3D position={[-6, -3]} size={[8, 8]} bounds={bounds}>
      {children(ref)}
    </Board.View3D>
  ))
}

/** The points of a curve, without the NaNs that separate its pieces. */
function points(curve: { dataX: number[]; dataY: number[] }) {
  return curve.dataX
    .map((x, i) => [x, curve.dataY[i]!] as const)
    .filter(([x, y]) => !Number.isNaN(x) && !Number.isNaN(y))
}

type Data = { dataX: number[]; dataY: number[] }

type BoardOptionsLike = { point?: { fillColor?: string } }

const unit = (v: number[]) => v.map((x) => x / Math.hypot(...v))

describe('Board', () => {
  // Boundary logs the errors it shows, which some of these tests trigger on purpose.
  const log = console.error
  beforeEach(() => {
    console.error = () => {}
  })
  afterEach(() => {
    console.error = log
  })

  test('applies the default and given classes', async () => {
    const { container } = render(() => <Board class="h-10 w-10" />)
    const div = container.querySelector('div.rounded-xl')!
    expect(div.classList.contains('h-10')).toBe(true)
    expect(div.classList.contains('h-175')).toBe(false)
  })

  test('an element outside a board shows an error', async () => {
    const { container } = render(() => (
      <Boundary>
        <Board.Point position={[0, 0]} />
      </Boundary>
    ))
    await waitFor(() =>
      expect(container.textContent).toContain('<point> must be placed inside a Board'),
    )
  })

  test('calls onFrame at every frame while given one, and only while shown', async () => {
    const frames: [number, unknown][] = []
    const [animated, setAnimated] = createSignal(true)
    const [hidden, setHidden] = createSignal(false)
    const { container } = render(() => (
      <div style={{ visibility: hidden() ? 'hidden' : 'visible' }}>
        <Board onFrame={animated() ? (dt, board) => frames.push([dt, board]) : undefined} />
      </div>
    ))
    await waitFor(() => expect(frames.length).toBeGreaterThan(2))
    for (const [dt, board] of frames) {
      expect(dt).toBeGreaterThanOrEqual(0)
      expect(dt).toBeLessThanOrEqual(0.1)
      expect(board).toHaveProperty('containerObj', container.querySelector('div.rounded-xl'))
    }

    setHidden(true)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const whileHidden = frames.length
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(frames.length).toBe(whileHidden)

    setHidden(false)
    await waitFor(() => expect(frames.length).toBeGreaterThan(whileHidden))
    setAnimated(false)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const stopped = frames.length
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(frames.length).toBe(stopped)
  })

  test('a 3D element outside a view shows an error', async () => {
    const { container } = render(() => (
      <Board>
        <Board.Point3D position={[0, 0, 0]} />
      </Board>
    ))
    await waitFor(() =>
      expect(container.textContent).toContain('<point3d> must be placed inside a View3D'),
    )
  })
})

describe('Element', () => {
  test('attributes follow their props', async () => {
    const [color, setColor] = createSignal('red')
    const { el } = await renderBoard<JXG.Point>((ref) => (
      <Board.Point position={[0, 0]} strokeColor={color()}>
        {ref}
      </Board.Point>
    ))
    expect(el().getAttribute('strokeColor')).toBe('red')
    setColor('blue')
    await waitFor(() => expect(el().getAttribute('strokeColor')).toBe('blue'))
  })

  test('is removed from the board when unmounted', async () => {
    const [shown, setShown] = createSignal(true)
    const { el } = await renderBoard<JXG.Point>((ref) => (
      <Show when={shown()}>
        <Board.Point position={[0, 0]}>{ref}</Board.Point>
      </Show>
    ))
    const { board, id } = el()
    expect(board.objects[id] === el()).toBe(true)
    setShown(false)
    await waitFor(() => expect(id in board.objects).toBe(false))
  })
})

describe('2D elements', () => {
  test('Point moves with its position and reports drags', async () => {
    const [position, setPosition] = createSignal<[number, number]>([1, 2])
    const dragged: number[][] = []
    const { el } = await renderBoard<JXG.Point>((ref) => (
      <Board.Point position={position()} onDrag={(p) => dragged.push(xy(p))}>
        {ref}
      </Board.Point>
    ))
    expect(xy(el())).toEqual([1, 2])
    setPosition([3, -1])
    await waitFor(() => expect(xy(el())).toEqual([3, -1]))
    drag(el(), [4, 4])
    expect(dragged).toEqual([[4, 4]])
  })

  test('Glider moves along its element and reports drags', async () => {
    const [position, setPosition] = createSignal<[number, number]>([1, 1])
    const dragged: number[][] = []
    const { el } = await renderBoard<JXG.Glider>((ref) => (
      <Board.Line
        points={[
          [0, 0],
          [1, 0],
        ]}
      >
        {(line) => (
          <Board.Glider position={position()} on={line} onDrag={(g) => dragged.push(xy(g))}>
            {ref}
          </Board.Glider>
        )}
      </Board.Line>
    ))
    expect(xy(el())).toEqual([1, 0])
    setPosition([3, 2])
    await waitFor(() => expect(xy(el())).toEqual([3, 0]))
    drag(el(), [-2, 0])
    expect(dragged).toEqual([[-2, 0]])
  })

  test('Line moves with its points', async () => {
    const [points, setPoints] = createSignal<[[number, number], [number, number]]>([
      [0, 0],
      [1, 1],
    ])
    const { el } = await renderBoard<JXG.Line>((ref) => (
      <Board.Line points={points()}>{ref}</Board.Line>
    ))
    setPoints([
      [2, 0],
      [2, 3],
    ])
    await waitFor(() =>
      expect([xy(el().point1), xy(el().point2)]).toEqual([
        [2, 0],
        [2, 3],
      ]),
    )
  })

  for (const [name, Component] of [
    ['Segment', Board.Segment],
    ['Arrow', Board.Arrow],
    ['Axis', Board.Axis],
  ] as const) {
    test(`${name} moves with its ends`, async () => {
      const [to, setTo] = createSignal<[number, number]>([1, 1])
      const { el } = await renderBoard<JXG.Segment>((ref) => (
        <Component from={[0, 0]} to={to()}>
          {ref as never}
        </Component>
      ))
      expect(xy(el().point2)).toEqual([1, 1])
      setTo([-3, 2])
      await waitFor(() => expect(xy(el().point2)).toEqual([-3, 2]))
      expect(xy(el().point1)).toEqual([0, 0])
    })
  }

  test('Circle follows its center and radius', async () => {
    const [center, setCenter] = createSignal<[number, number]>([0, 0])
    const [radius, setRadius] = createSignal(1)
    const { el } = await renderBoard<JXG.Circle>((ref) => (
      <Board.Circle center={center()} radius={radius()}>
        {ref}
      </Board.Circle>
    ))
    expect(el().Radius()).toBe(1)
    setCenter([2, 3])
    setRadius(4)
    await waitFor(() => expect([...xy(el().center), el().Radius()]).toEqual([2, 3, 4]))
  })

  test('Circle through a point', async () => {
    const { el } = await renderBoard<JXG.Circle>((ref) => (
      <Board.Circle center={[0, 0]} through={[3, 4]}>
        {ref}
      </Board.Circle>
    ))
    expect(el().Radius()).toBe(5)
  })

  type Three = [[number, number], [number, number], [number, number]]
  const at = (points: Three, x: number, y: number) =>
    points.map(([px, py]) => [px + x, py + y]) as Three

  test('Angle follows its points, the vertex in the middle', async () => {
    const quarter: Three = [
      [1, 0],
      [0, 0],
      [0, 1],
    ]
    const [points, setPoints] = createSignal(quarter)
    const { el } = await renderBoard<JXG.Angle>((ref) => (
      <Board.Angle points={points()}>{ref}</Board.Angle>
    ))
    expect(value(el())).toBeCloseTo(Math.PI / 2)
    setPoints(at(quarter, 2, 3))
    await waitFor(() =>
      expect([xy(el().radiuspoint), xy(el().center), xy(el().anglepoint)]).toEqual(
        at(quarter, 2, 3),
      ),
    )
    expect(value(el())).toBeCloseTo(Math.PI / 2)
  })

  // Arc and sector both take the center first.
  const centerFirst: Three = [
    [0, 0],
    [2, 0],
    [0, 1],
  ]

  test('Arc follows its points, the center first', async () => {
    const [points, setPoints] = createSignal(centerFirst)
    const { el } = await renderBoard<JXG.Arc>((ref) => (
      <Board.Arc points={points()}>{ref}</Board.Arc>
    ))
    const ends = () => [xy(el().center), xy(el().radiuspoint), xy(el().anglepoint)]
    expect(ends()).toEqual(centerFirst)
    expect(el().Radius()).toBe(2)
    setPoints(at(centerFirst, 2, 3))
    await waitFor(() => expect(ends()).toEqual(at(centerFirst, 2, 3)))
    expect(el().Radius()).toBe(2)
  })

  test('Sector follows its points, the center first', async () => {
    const [points, setPoints] = createSignal(centerFirst)
    const { el } = await renderBoard<JXG.Sector>((ref) => (
      <Board.Sector points={points()}>{ref}</Board.Sector>
    ))
    const ends = () => [xy(el().center), xy(el().radiuspoint), xy(el().anglepoint)]
    expect(ends()).toEqual(centerFirst)
    expect(value(el())).toBeCloseTo(Math.PI)
    setPoints(at(centerFirst, 2, 3))
    await waitFor(() => expect(ends()).toEqual(at(centerFirst, 2, 3)))
    expect(value(el())).toBeCloseTo(Math.PI)
  })

  test('Polygon follows its points', async () => {
    const [points, setPoints] = createSignal<Array<[number, number]>>([
      [0, 0],
      [1, 0],
      [0, 1],
    ])
    const { el } = await renderBoard<JXG.Polygon>((ref) => (
      <Board.Polygon points={points()}>{ref}</Board.Polygon>
    ))
    expect(el().Area()).toBeCloseTo(0.5)
    setPoints([
      [0, 0],
      [2, 0],
      [0, 2],
    ])
    await waitFor(() => expect(el().Area()).toBeCloseTo(2))
  })

  // createSignal and its setter call a function they are given, so functions are wrapped.
  const identity = () => (x: number) => x
  const double = () => (x: number) => 2 * x

  test('Plot follows its function and domain', async () => {
    const [fn, setFn] = createSignal(identity)
    const [domain, setDomain] = createSignal<[number, number]>([0, 1])
    const { el } = await renderBoard<JXG.Functiongraph>((ref) => (
      <Board.Plot fn={fn()} domain={domain()}>
        {ref}
      </Board.Plot>
    ))
    expect(el().Y(3, false)).toBe(3)
    setFn(double)
    setDomain([-2, 2])
    await waitFor(() => expect(el().Y(3, false)).toBe(6))
    expect([el().minX(), el().maxX()]).toEqual([-2, 2])
  })

  test('Integral follows its curve and domain', async () => {
    const [fn, setFn] = createSignal(identity)
    const [domain, setDomain] = createSignal<[number, number]>([0, 1])
    const { el } = await renderBoard<JXG.Integral>((ref) => (
      <Board.Plot fn={fn()}>
        {(plot) => (
          <Board.Integral curve={plot} domain={domain()}>
            {ref}
          </Board.Integral>
        )}
      </Board.Plot>
    ))
    expect(value(el())).toBeCloseTo(0.5)
    setFn(double)
    await waitFor(() => expect(value(el())).toBeCloseTo(1))
    setDomain([0, 2])
    await waitFor(() => expect(value(el())).toBeCloseTo(4))
  })

  test('RiemannSum follows its function, count, type and domain', async () => {
    const [f, setF] = createSignal(identity)
    const [n, setN] = createSignal(2)
    const [type, setType] = createSignal<'left' | 'right'>('left')
    const [domain, setDomain] = createSignal<[number, number]>([0, 1])
    const { el } = await renderBoard<JXG.Riemannsum>((ref) => (
      <Board.RiemannSum f={f()} n={n()} type={type()} domain={domain()}>
        {ref}
      </Board.RiemannSum>
    ))
    expect(value(el())).toBeCloseTo(0.25)
    setN(4)
    await waitFor(() => expect(value(el())).toBeCloseTo(0.375))
    setType('right')
    await waitFor(() => expect(value(el())).toBeCloseTo(0.625))
    setF(double)
    await waitFor(() => expect(value(el())).toBeCloseTo(1.25))
    setDomain([0, 2])
    await waitFor(() => expect(value(el())).toBeCloseTo(5))
  })

  test('Text follows its position and content', async () => {
    const [position, setPosition] = createSignal<[number, number]>([0, 0])
    const [content, setContent] = createSignal<string | number>('a')
    const { el } = await renderBoard<JXG.Text>((ref) => (
      <Board.Text position={position()} content={content()}>
        {ref}
      </Board.Text>
    ))
    const text = () => Reflect.get(el(), 'plaintext')
    expect(text()).toBe('a')
    setPosition([1, 2])
    setContent(42)
    await waitFor(() => expect([...xy(el()), text()]).toEqual([1, 2, '42']))
  })
})

describe('3D elements', () => {
  test('View3D holds 3D points and vectors that follow their props', async () => {
    const [tip, setTip] = createSignal<[number, number, number]>([1, 2, 3])
    let point: JXG.Point3D | undefined
    let linked: JXG.Line3D | undefined
    const { el, unmount } = await renderBoard<JXG.Line3D>((ref) => (
      <Board.View3D position={[-6, -3]} size={[8, 8]} bounds={bounds}>
        <Board.Point3D position={[1, 1, 1]} name="P">
          {(p) => {
            point = p
            return (
              <Board.Vector3D from={p} to={[0, 0, 4]}>
                {(v) => ((linked = v), null)}
              </Board.Vector3D>
            )
          }}
        </Board.Point3D>
        <Board.Vector3D from={[0, 0, 0]} to={tip()} strokeColor="red">
          {ref}
        </Board.Vector3D>
      </Board.View3D>
    ))
    const tipPoint = (el() as any).point2 as JXG.Point3D
    expect(xyz(tipPoint)).toEqual([1, 2, 3])
    expect((el() as any).element2D.getAttribute('lastArrow')).toBeTruthy()
    expect((linked as any).point1).toBe(point)
    setTip([4, 0, -1])
    await waitFor(() => expect(xyz(tipPoint)).toEqual([4, 0, -1]))
    unmount()
  })

  test('Point3D follows its position', async () => {
    const [position, setPosition] = createSignal<[number, number, number]>([1, 1, 1])
    const { el } = await renderBoard<JXG.Point3D>((ref) => (
      <Board.View3D position={[-6, -3]} size={[8, 8]} bounds={bounds}>
        <Board.Point3D position={position()}>{ref}</Board.Point3D>
      </Board.View3D>
    ))
    setPosition([-2, 3, 0])
    await waitFor(() => expect(xyz(el())).toEqual([-2, 3, 0]))
  })

  test('Point3D reports its 3D position while dragged, until onDrag is removed', async () => {
    const dragged: number[][] = []
    const [listening, setListening] = createSignal(true)
    const { el } = await renderBoard<JXG.Point3D>((ref) => (
      <Board.View3D position={[-6, -3]} size={[8, 8]} bounds={bounds}>
        <Board.Point3D
          position={[1, 1, 1]}
          onDrag={listening() ? (p) => dragged.push(xyz(p)) : undefined}
        >
          {ref}
        </Board.Point3D>
      </Board.View3D>
    ))
    const projection = el().element2D
    drag(projection, [projection.X() + 1, projection.Y()])
    expect(dragged).toHaveLength(1)
    expect(dragged[0]).not.toEqual([1, 1, 1])
    expect(dragged[0]![2]).toBeCloseTo(1)
    setListening(false)
    flush()
    drag(projection, [projection.X() + 1, projection.Y()])
    expect(dragged).toHaveLength(1)
  })

  test('View3D follows its bounds', async () => {
    const [box, setBox] = createSignal(bounds)
    const { el } = await renderBoard<JXG.View3D>((ref) => (
      <Board.View3D position={[-6, -3]} size={[8, 8]} bounds={box()}>
        <Board.Point3D position={[0, 0, 0]}>{(p) => ref(Reflect.get(p, 'view'))}</Board.Point3D>
      </Board.View3D>
    ))
    const next: typeof bounds = [
      [0, 10],
      [0, 10],
      [0, 10],
    ]
    setBox(next)
    await waitFor(() => expect(Reflect.get(el(), 'bbox3D')).toEqual(next))
  })
})

describe('calculus elements', () => {
  const square = () => (x: number) => x * x
  const cube = () => (x: number) => x ** 3

  test('Slider follows its props and reports drags', async () => {
    const [value, setValue] = createSignal(5)
    const [max, setMax] = createSignal(10)
    const [from, setFrom] = createSignal<[number, number]>([0, 0])
    const changes: number[] = []
    const { el } = await renderBoard<JXG.Slider>((ref) => (
      <Board.Slider
        from={from()}
        to={[4, 0]}
        min={0}
        max={max()}
        value={value()}
        onChange={(v) => changes.push(v)}
      >
        {ref}
      </Board.Slider>
    ))
    expect(el().Value()).toBe(5)
    expect(el().X()).toBe(2)
    setValue(2)
    await waitFor(() => expect(el().Value()).toBe(2))
    setMax(20)
    await waitFor(() => expect(el().X()).toBeCloseTo(0.4))
    expect(el().Value()).toBeCloseTo(2)
    setFrom([-4, 0])
    await waitFor(() => expect(xy(el().point1)).toEqual([-4, 0]))
    drag(el(), [0, 0])
    expect(changes).toEqual([10])
  })

  test('Tangent and Normal follow the glider they are at', async () => {
    const [x, setX] = createSignal(1)
    let normal: JXG.Normal | undefined
    const { el } = await renderBoard<JXG.Tangent>((ref) => (
      <Board.Plot fn={(t) => t * t}>
        {(plot) => (
          <Board.Glider position={[x(), x() ** 2]} on={plot}>
            {(glider) => (
              <>
                <Board.Tangent at={glider}>{ref}</Board.Tangent>
                <Board.Normal at={glider}>{(n) => ((normal = n), null)}</Board.Normal>
              </>
            )}
          </Board.Glider>
        )}
      </Board.Plot>
    ))
    expect(slope(el())).toBeCloseTo(2)
    expect(slope(normal!)).toBeCloseTo(-0.5)
    setX(2)
    await waitFor(() => expect(slope(el())).toBeCloseTo(4))
    expect(slope(normal!)).toBeCloseTo(-0.25)
  })

  test('Tangent is rebuilt at another glider', async () => {
    const [second, setSecond] = createSignal(false)
    const { el } = await renderBoard<JXG.Tangent>((ref) => (
      <Board.Plot fn={(t) => t * t}>
        {(plot) => (
          <Board.Glider position={[1, 1]} on={plot}>
            {(first) => (
              <Board.Glider position={[3, 9]} on={plot}>
                {(other) => <Board.Tangent at={second() ? other : first}>{ref}</Board.Tangent>}
              </Board.Glider>
            )}
          </Board.Glider>
        )}
      </Board.Plot>
    ))
    const before = el()
    expect(slope(before)).toBeCloseTo(2)
    setSecond(true)
    await waitFor(() => expect(slope(el())).toBeCloseTo(6))
    expect(before.id in before.board.objects).toBe(false)
  })

  test('Plot is not redrawn for a signal read only inside its function', async () => {
    const [k, setK] = createSignal(1)
    const { el } = await renderBoard<JXG.Functiongraph>((ref) => (
      <Board.Plot fn={(x) => k() * x}>{ref}</Board.Plot>
    ))
    const drawnSlope = () => {
      const { points } = el() as unknown as { points: { usrCoords: number[] }[] }
      const [, x, y] = points.find(({ usrCoords }) => usrCoords[1]! > 0.5)!.usrCoords
      return y! / x!
    }
    expect(drawnSlope()).toBeCloseTo(1)
    setK(3)
    flush()
    expect(drawnSlope()).toBeCloseTo(1)
  })

  test('Plot is rebuilt when it gains a domain', async () => {
    const [domain, setDomain] = createSignal<[number, number]>()
    const { el } = await renderBoard<JXG.Functiongraph>((ref) => (
      <Board.Plot fn={(x) => x} domain={domain()}>
        {ref}
      </Board.Plot>
    ))
    const before = el()
    setDomain([1, 2])
    await waitFor(() => expect(el() === before).toBe(false))
    expect([el().minX(), el().maxX()]).toEqual([1, 2])
    expect(before.id in before.board.objects).toBe(false)
  })

  test('Curve follows its function and domain', async () => {
    const [radius, setRadius] = createSignal(1)
    const [domain, setDomain] = createSignal<[number, number]>([0, Math.PI])
    const { el } = await renderBoard<JXG.Curve>((ref) => {
      const circle = createMemo(() => {
        const r = radius()
        return (t: number): [number, number] => [r * Math.cos(t), r * Math.sin(t)]
      })
      return (
        <Board.Curve fn={circle()} domain={domain()}>
          {ref}
        </Board.Curve>
      )
    })
    expect([el().X(0, false), el().Y(Math.PI / 2, false)]).toEqual([1, 1])
    setRadius(2)
    await waitFor(() => expect(el().X(0, false)).toBe(2))
    setDomain([0, 1])
    await waitFor(() => expect([el().minX(), el().maxX()]).toEqual([0, 1]))
  })

  test('PolarCurve follows its radius, center and domain', async () => {
    const [center, setCenter] = createSignal<[number, number]>()
    const [domain, setDomain] = createSignal<[number, number]>()
    const { el } = await renderBoard<JXG.Curve>((ref) => (
      <Board.PolarCurve r={(theta) => 1 + theta} center={center()} domain={domain()}>
        {ref}
      </Board.PolarCurve>
    ))
    expect([el().X(0, false), el().Y(0, false)]).toEqual([1, 0])
    expect([el().minX(), el().maxX()]).toEqual([0, 2 * Math.PI])
    setCenter([2, 3])
    await waitFor(() => expect([el().X(0, false), el().Y(0, false)]).toEqual([3, 3]))
    setDomain([0, Math.PI])
    await waitFor(() => expect(el().maxX()).toBe(Math.PI))
  })

  test('Derivative follows the function and domain of its plot', async () => {
    const [fn, setFn] = createSignal(square)
    const [domain, setDomain] = createSignal<[number, number]>([-2, 2])
    const { el } = await renderBoard<JXG.Curve>((ref) => (
      <Board.Plot fn={fn()} domain={domain()}>
        {(plot) => <Board.Derivative of={plot}>{ref}</Board.Derivative>}
      </Board.Plot>
    ))
    expect(el().Y(1, false)).toBeCloseTo(2)
    expect([el().minX(), el().maxX()]).toEqual([-2, 2])
    setFn(cube)
    await waitFor(() => expect(el().Y(1, false)).toBeCloseTo(3))
    setDomain([0, 1])
    await waitFor(() => expect([el().minX(), el().maxX()]).toEqual([0, 1]))
  })

  test('ImplicitCurve follows its function', async () => {
    const [r, setR] = createSignal(1)
    const { el } = await renderBoard<JXG.Curve>((ref) => {
      const circle = createMemo(() => {
        const r2 = r() ** 2
        return (x: number, y: number) => x * x + y * y - r2
      })
      return (
        <Board.ImplicitCurve
          fn={circle()}
          domain={[
            [-3, 3],
            [-3, 3],
          ]}
        >
          {ref}
        </Board.ImplicitCurve>
      )
    })
    const radii = () => points(el() as unknown as Data).map(([x, y]) => Math.hypot(x, y))
    expect(radii().length).toBeGreaterThan(0)
    for (const radius of radii()) expect(radius).toBeCloseTo(1, 1)
    setR(2)
    await waitFor(() => expect(radii()[0]).toBeCloseTo(2, 1))
    for (const radius of radii()) expect(radius).toBeCloseTo(2, 1)
  })

  test('ImplicitCurve is limited to its domain', async () => {
    const [domain, setDomain] = createSignal<[[number, number], [number, number]]>([
      [-3, 3],
      [-3, 3],
    ])
    const { el } = await renderBoard<JXG.Curve>((ref) => (
      <Board.ImplicitCurve fn={(x, y) => x * x + y * y - 4} domain={domain()}>
        {ref}
      </Board.ImplicitCurve>
    ))
    expect(points(el() as unknown as Data).some(([x]) => x < 0)).toBe(true)
    setDomain([
      [0, 3],
      [-3, 3],
    ])
    await waitFor(() =>
      expect(points(el() as unknown as Data).every(([x]) => x >= -0.1)).toBe(true),
    )
  })

  test('VectorField follows its function, domain and steps', async () => {
    const [vertical, setVertical] = createSignal(false)
    const [domain, setDomain] = createSignal<[[number, number], [number, number]]>([
      [0, 2],
      [0, 2],
    ])
    const [steps, setSteps] = createSignal(2)
    const { el } = await renderBoard<JXG.Curve>((ref) => (
      <Board.VectorField
        fn={vertical() ? () => [0, 1] : () => [1, 0]}
        domain={domain()}
        steps={steps()}
      >
        {ref}
      </Board.VectorField>
    ))
    const data = () => el() as unknown as Data
    const scale = () => el().getAttribute('scale') as number
    const firstArrow = () => [
      data().dataX[0],
      data().dataY[0],
      data().dataX[1]! - data().dataX[0]!,
      data().dataY[1]! - data().dataY[0]!,
    ]
    const columns = () => new Set(points(data()).map(([x]) => x)).size
    expect(firstArrow()).toEqual([0, 0, scale(), 0])
    setVertical(true)
    await waitFor(() => expect(firstArrow()).toEqual([0, 0, 0, scale()]))
    setDomain([
      [1, 3],
      [1, 3],
    ])
    await waitFor(() => expect(firstArrow().slice(0, 2)).toEqual([1, 1]))
    const before = columns()
    setSteps(4)
    await waitFor(() => expect(columns()).toBeGreaterThan(before))
  })

  test('SlopeField follows its function', async () => {
    const [slope, setSlope] = createSignal(1)
    const { el } = await renderBoard<JXG.Curve>((ref) => (
      <Board.SlopeField
        fn={(
          (m) => () =>
            m
        )(slope())}
        domain={[
          [0, 2],
          [0, 2],
        ]}
      >
        {ref}
      </Board.SlopeField>
    ))
    const firstSlope = () => {
      const { dataX, dataY } = el() as unknown as Data
      return (dataY[1]! - dataY[0]!) / (dataX[1]! - dataX[0]!)
    }
    expect(firstSlope()).toBeCloseTo(1)
    setSlope(-2)
    await waitFor(() => expect(firstSlope()).toBeCloseTo(-2))
  })

  test('Inequality is rebuilt for another boundary', async () => {
    const [steep, setSteep] = createSignal(false)
    const { el } = await renderBoard<JXG.Inequality>((ref) => (
      <Board.Line
        points={[
          [0, 0],
          [1, 1],
        ]}
      >
        {(diagonal) => (
          <Board.Line
            points={[
              [0, 0],
              [1, 3],
            ]}
          >
            {(other) => <Board.Inequality of={steep() ? other : diagonal}>{ref}</Board.Inequality>}
          </Board.Line>
        )}
      </Board.Line>
    ))
    const before = el()
    expect(points(before as unknown as Data).length).toBeGreaterThan(0)
    setSteep(true)
    await waitFor(() => expect(el() === before).toBe(false))
    expect(before.id in before.board.objects).toBe(false)
  })
})

describe('multivariable elements', () => {
  test('Plot3D follows its function and domain', async () => {
    const [k, setK] = createSignal(1)
    const [domain, setDomain] = createSignal<[[number, number], [number, number]]>([
      [-1, 1],
      [-1, 1],
    ])
    const { el } = await renderView<JXG.Surface3D>((ref) => {
      const plane = createMemo(() => {
        const c = k()
        return (x: number, y: number) => c * (x + y)
      })
      return (
        <Board.Plot3D fn={plane()} domain={domain()}>
          {ref}
        </Board.Plot3D>
      )
    })
    const at = (u: number, v: number) =>
      (el() as unknown as { Z(u: number, v: number): number }).Z(u, v)
    expect(at(1, 2)).toBe(3)
    setK(2)
    await waitFor(() => expect(at(1, 2)).toBe(6))
    setDomain([
      [0, 2],
      [0, 3],
    ])
    await waitFor(() => expect(JXG.evaluate(Reflect.get(el(), 'range_v'))).toEqual([0, 3]))
  })

  test('Surface3D follows its function', async () => {
    const [r, setR] = createSignal(1)
    const { el } = await renderView<JXG.Surface3D>((ref) => {
      const cylinder = createMemo(() => {
        const radius = r()
        return (u: number, v: number): [number, number, number] => [
          radius * Math.cos(u),
          radius * Math.sin(u),
          v,
        ]
      })
      return (
        <Board.Surface3D
          fn={cylinder()}
          domain={[
            [0, 2 * Math.PI],
            [0, 1],
          ]}
        >
          {ref}
        </Board.Surface3D>
      )
    })
    const at = (u: number, v: number) => {
      const s = el() as unknown as Record<'X' | 'Y' | 'Z', (u: number, v: number) => number>
      return [s.X(u, v), s.Y(u, v), s.Z(u, v)]
    }
    expect(at(0, 0.5)).toEqual([1, 0, 0.5])
    setR(3)
    await waitFor(() => expect(at(0, 0.5)).toEqual([3, 0, 0.5]))
  })

  test('Curve3D follows its function and domain', async () => {
    const [pitch, setPitch] = createSignal(1)
    const [domain, setDomain] = createSignal<[number, number]>([0, 1])
    const { el } = await renderView<JXG.Curve3D>((ref) => {
      const helix = createMemo(() => {
        const p = pitch()
        return (t: number): [number, number, number] => [Math.cos(t), Math.sin(t), p * t]
      })
      return (
        <Board.Curve3D fn={helix()} domain={domain()}>
          {ref}
        </Board.Curve3D>
      )
    })
    const z = (t: number) => (el() as unknown as { Z(t: number): number }).Z(t)
    expect(z(2)).toBe(2)
    setPitch(3)
    await waitFor(() => expect(z(2)).toBe(6))
    setDomain([0, 5])
    await waitFor(() => expect(JXG.evaluate(Reflect.get(el(), 'range'))).toEqual([0, 5]))
  })

  test('Line3D follows its point and direction', async () => {
    const [point, setPoint] = createSignal<[number, number, number]>([0, 0, 0])
    const [direction, setDirection] = createSignal<[number, number, number]>([1, 0, 0])
    const { el } = await renderView<JXG.Line3D>((ref) => (
      <Board.Line3D point={point()} direction={direction()}>
        {ref}
      </Board.Line3D>
    ))
    const line = () => el() as unknown as { point: JXG.Point3D; vec: number[] }
    expect(line().vec.slice(1)).toEqual([1, 0, 0])
    setPoint([1, 2, 3])
    setDirection([0, 0, 2])
    await waitFor(() => expect(line().vec.slice(1)).toEqual([0, 0, 2]))
    expect(xyz(line().point)).toEqual([1, 2, 3])
  })

  test('Plane3D follows its point and directions', async () => {
    const [point, setPoint] = createSignal<[number, number, number]>([0, 0, 0])
    const [slope, setSlope] = createSignal(1)
    const { el } = await renderView<JXG.Plane3D>((ref) => (
      <Board.Plane3D
        point={point()}
        directions={[
          [1, 0, slope()],
          [0, 1, 0],
        ]}
      >
        {ref}
      </Board.Plane3D>
    ))
    const plane = () => el() as unknown as { point: JXG.Point3D; vec1: number[] }
    // JSXGraph normalizes the directions of a plane.
    expect(plane().vec1.slice(1)).toEqual(unit([1, 0, 1]))
    setPoint([1, 1, 1])
    setSlope(4)
    await waitFor(() => expect(plane().vec1.slice(1)).toEqual(unit([1, 0, 4])))
    expect(xyz(plane().point)).toEqual([1, 1, 1])
  })

  test('Line3D and Plane3D leave the directions they are given untouched', async () => {
    const direction: [number, number, number] = [3, 0, 4]
    const directions: [[number, number, number], [number, number, number]] = [
      [2, 0, 0],
      [0, 0, 5],
    ]
    const { el } = await renderView<JXG.Plane3D>((ref) => (
      <>
        <Board.Line3D point={[0, 0, 0]} direction={direction} />
        <Board.Plane3D point={[0, 0, 0]} directions={directions}>
          {ref}
        </Board.Plane3D>
      </>
    ))
    el().board.update()
    expect(direction).toEqual([3, 0, 4])
    expect(directions).toEqual([
      [2, 0, 0],
      [0, 0, 5],
    ])
  })

  test('Plane3D is clipped to the view without a range, and made of faces with one', async () => {
    const [range, setRange] = createSignal<[[number, number], [number, number]]>()
    const { el } = await renderView<JXG.Plane3D>((ref) => (
      <Board.Plane3D
        point={[0, 0, 0]}
        directions={[
          [1, 0, 0],
          [0, 1, 0],
        ]}
        range={range()}
      >
        {ref}
      </Board.Plane3D>
    ))
    const faces = (plane: JXG.Plane3D) =>
      (Object.values(plane.board.objects) as JXG.GeometryElement[]).filter(
        (o) => o.elType === 'face3d' && o.parents.includes(plane.id),
      ).length
    const infinite = el()
    expect(points((infinite as any).element2D).length).toBeGreaterThan(0)
    expect(faces(infinite)).toBe(0)
    setRange([
      [-1, 1],
      [-1, 1],
    ])
    await waitFor(() => expect(el() === infinite).toBe(false))
    expect(faces(el())).toBeGreaterThan(0)
  })

  test('Polygon3D follows its points', async () => {
    const [top, setTop] = createSignal<[number, number, number]>([0, 0, 1])
    let corner: JXG.Point3D | undefined
    const { el } = await renderView<JXG.Polygon3D>((ref) => (
      <Board.Point3D position={[1, 0, 0]}>
        {(p) => {
          corner = p
          return (
            <Board.Polygon3D points={[[0, 0, 0], p, top()]} fillColor="red">
              {ref}
            </Board.Polygon3D>
          )
        }}
      </Board.Point3D>
    ))
    expect(el().vertices[1]).toBe(corner!)
    setTop([0, 2, 3])
    await waitFor(() => expect(xyz(el().vertices[2] as XYZ)).toEqual([0, 2, 3]))
  })

  test('Point3D slides on the element it is on', async () => {
    let surface: JXG.Surface3D | undefined
    const { el } = await renderView<JXG.Point3D>((ref) => (
      <Board.Plot3D
        fn={(x, y) => x + y}
        domain={[
          [-3, 3],
          [-3, 3],
        ]}
      >
        {(s) => {
          surface = s
          return (
            <Board.Point3D position={[1, 1, 5]} on={s}>
              {ref}
            </Board.Point3D>
          )
        }}
      </Board.Plot3D>
    ))
    expect(Reflect.get(el(), 'slide') === surface).toBe(true)
    const [x, y, z] = xyz(el())
    expect(z!).toBeCloseTo(x! + y!, 1)
  })
})

describe('BoardDefaults', () => {
  async function renderWithDefaults<T>(
    defaults: Parameters<typeof BoardDefaults>[0],
    children: (ref: (el: T) => null) => JSX.Element,
    board: Partial<JXG.BoardAttributes> = {},
  ) {
    let element: T | undefined
    render(() => (
      <BoardDefaults {...defaults}>
        <Board boundingBox={[-10, 10, 10, -10]} {...board}>
          {children((el) => ((element = el), null))}
        </Board>
      </BoardDefaults>
    ))
    await waitFor(() => expect(element).toBeDefined())
    return () => element!
  }

  test('sets the defaults of an element type, which the props of an element override', async () => {
    let other: JXG.Point | undefined
    const el = await renderWithDefaults<JXG.Point>(
      { point: { strokeColor: 'red', size: 7 } },
      (ref) => (
        <>
          <Board.Point position={[0, 0]} strokeColor="blue">
            {ref}
          </Board.Point>
          <Board.Point position={[1, 1]}>{(p) => ((other = p), null)}</Board.Point>
        </>
      ),
    )
    expect([el().getAttribute('strokeColor'), el().getAttribute('size')]).toEqual(['blue', 7])
    expect(other!.getAttribute('strokeColor')).toBe('red')
  })

  test('elements sets what no element type sets itself', async () => {
    let segment: JXG.Segment | undefined
    const el = await renderWithDefaults<JXG.Point>({ elements: { dash: 2 } }, (ref) => (
      <>
        <Board.Point position={[0, 0]}>{ref}</Board.Point>
        <Board.Segment from={[0, 0]} to={[1, 1]}>
          {(s) => ((segment = s), null)}
        </Board.Segment>
      </>
    ))
    expect(el().getAttribute('dash')).toBe(2)
    expect(segment!.getAttribute('dash')).toBe(2)
  })

  test('sets the attributes of the board, which its props override', async () => {
    const withAxes = await renderWithDefaults<JXG.Point>({ board: { axis: true } }, (ref) => (
      <Board.Point position={[0, 0]}>{ref}</Board.Point>
    ))
    expect(Reflect.get(withAxes().board, 'defaultAxes')).toBeTruthy()
    const without = await renderWithDefaults<JXG.Point>(
      { board: { axis: true } },
      (ref) => <Board.Point position={[0, 0]}>{ref}</Board.Point>,
      { axis: false },
    )
    expect(Reflect.get(without().board, 'defaultAxes')).toBeFalsy()
  })

  test('also applies to what the board creates itself, such as its axes', async () => {
    const el = await renderWithDefaults<JXG.Point>(
      { board: { axis: true }, axis: { strokeColor: 'purple' } },
      (ref) => <Board.Point position={[0, 0]}>{ref}</Board.Point>,
    )
    const axes = Reflect.get(el().board, 'defaultAxes') as unknown as { x: JXG.Axis }
    expect(axes.x.getAttribute('strokeColor')).toBe('purple')
  })

  test('an inner BoardDefaults is merged over an outer one', async () => {
    let element: JXG.Point | undefined
    render(() => (
      <BoardDefaults point={{ strokeColor: 'red', size: 7 }} board={{ axis: true }}>
        <BoardDefaults point={{ size: 2 }}>
          <Board>
            <Board.Point position={[0, 0]}>{(p) => ((element = p), null)}</Board.Point>
          </Board>
        </BoardDefaults>
      </BoardDefaults>
    ))
    await waitFor(() => expect(element).toBeDefined())
    expect([element!.getAttribute('strokeColor'), element!.getAttribute('size')]).toEqual([
      'red',
      2,
    ])
    expect(Reflect.get(element!.board, 'defaultAxes')).toBeTruthy()
  })

  test('is combined with the theme of a board', async () => {
    const el = await renderWithDefaults<JXG.Point>(
      { point: { size: 7 } },
      (ref) => <Board.Point position={[0, 0]}>{ref}</Board.Point>,
      { theme: 'mono_thin' },
    )
    expect(el().getAttribute('size')).toBe(7)
    expect(el().getAttribute('fillColor')).toBe(
      (JXG.themes.mono_thin as BoardOptionsLike).point!.fillColor,
    )
  })

  test('leaves no theme behind and other boards alone', async () => {
    const themes = Object.keys(JXG.themes)
    await renderWithDefaults<JXG.Point>({ point: { size: 7 } }, (ref) => (
      <Board.Point position={[0, 0]}>{ref}</Board.Point>
    ))
    expect(Object.keys(JXG.themes)).toEqual(themes)
    const { el } = await renderBoard<JXG.Point>((ref) => (
      <Board.Point position={[0, 0]}>{ref}</Board.Point>
    ))
    expect(el().getAttribute('size')).not.toBe(7)
  })
})

describe('defaults that differ from JSXGraph', () => {
  const visible = (el: JXG.GeometryElement) => Boolean(Reflect.get(el, 'visPropCalc').visible)
  const label = (el: JXG.GeometryElement) => Reflect.get(el, 'label') as JXG.Text

  test('labels position themselves, unless BoardDefaults or props say otherwise', async () => {
    const { el } = await renderBoard<JXG.Point>((ref) => (
      <Board.Point position={[0, 0]} name="A">
        {ref}
      </Board.Point>
    ))
    expect(label(el()).getAttribute('autoPosition')).toBe(true)

    let fromDefaults: JXG.Point | undefined
    render(() => (
      <BoardDefaults label={{ autoPosition: false }}>
        <Board>
          <Board.Point position={[0, 0]} name="B">
            {(p) => ((fromDefaults = p), null)}
          </Board.Point>
        </Board>
      </BoardDefaults>
    ))
    const { el: off } = await renderBoard<JXG.Point>((ref) => (
      <Board.Point position={[0, 0]} name="C" label={{ autoPosition: false }}>
        {ref}
      </Board.Point>
    ))
    await waitFor(() => expect(fromDefaults).toBeDefined())
    expect(label(fromDefaults!).getAttribute('autoPosition')).toBe(false)
    expect(label(off()).getAttribute('autoPosition')).toBe(false)
  })

  test('labels in a 3D view keep their place, unless an element asks otherwise', async () => {
    let placed: JXG.Point3D | undefined
    const { el } = await renderView<JXG.Point3D>((ref) => (
      <>
        <Board.Point3D position={[1, 1, 1]} name="P">
          {ref}
        </Board.Point3D>
        <Board.Point3D position={[2, 2, 2]} name="Q" label={{ autoPosition: true }}>
          {(p) => ((placed = p), null)}
        </Board.Point3D>
      </>
    ))
    await waitFor(() => expect(placed).toBeDefined())
    const point2D = (p: JXG.Point3D) => Reflect.get(p, 'element2D') as JXG.Point
    expect(label(point2D(el())).getAttribute('autoPosition')).toBe(false)
    expect(label(point2D(placed!)).getAttribute('autoPosition')).toBe(true)
  })

  test('coordinates create hidden points, while points passed stay visible', async () => {
    let given: JXG.Point | undefined
    let polygon: JXG.Polygon | undefined
    const { el: angle } = await renderBoard<JXG.Angle>((ref) => (
      <Board.Point position={[0, 0]}>
        {(p) => {
          given = p
          return (
            <>
              <Board.Angle points={[[1, 0], p, [0, 1]]}>{ref}</Board.Angle>
              <Board.Polygon points={[[2, 2], [3, 2], p]}>
                {(el) => ((polygon = el), null)}
              </Board.Polygon>
            </>
          )
        }}
      </Board.Point>
    ))
    await waitFor(() => expect(polygon).toBeDefined())
    expect([angle().radiuspoint, angle().anglepoint].map(visible)).toEqual([false, false])
    expect(polygon!.vertices.slice(0, 2).map(visible)).toEqual([false, false])
    expect(visible(given!)).toBe(true)
  })

  test('an integral shows no points at its bounds', async () => {
    const { el } = await renderBoard<JXG.Integral>((ref) => (
      <Board.Plot fn={(x) => x * x}>
        {(curve) => (
          <Board.Integral curve={curve} domain={[0, 1]}>
            {ref}
          </Board.Integral>
        )}
      </Board.Plot>
    ))
    const points = ['curveLeft', 'curveRight', 'baseLeft', 'baseRight'].map(
      (key) => Reflect.get(el(), key) as JXG.Point,
    )
    expect(points.map(visible)).toEqual([false, false, false, false])
  })
})

describe('Custom', () => {
  test('removes what it created when unmounted, and only that', async () => {
    const [shown, setShown] = createSignal(true)
    let custom: JXG.Point | undefined
    const { el } = await renderBoard<JXG.Point>((ref) => (
      <>
        <Board.Point position={[0, 0]}>{ref}</Board.Point>
        <Show when={shown()}>
          <Board.Custom>
            {(board) => {
              custom = board.create('point', [1, 1])
              board.create('segment', [custom, [2, 2]])
            }}
          </Board.Custom>
        </Show>
      </>
    ))
    await waitFor(() => expect(custom).toBeDefined())
    const board = el().board
    const count = Object.keys(board.objects).length
    setShown(false)
    await waitFor(() => expect(custom!.id in board.objects).toBe(false))
    expect(Object.keys(board.objects).length).toBeLessThan(count)
    expect(el().id in board.objects).toBe(true)
  })

  test('can follow signals with effects', async () => {
    const [x, setX] = createSignal(1)
    let point: JXG.Point | undefined
    render(() => (
      <Board>
        <Board.Custom>
          {(board) => {
            const p = board.create('point', [x(), 0])
            createEffect(x, (x) => {
              p.moveTo([x, 0])
            })
            point = p
          }}
        </Board.Custom>
      </Board>
    ))
    await waitFor(() => expect(point).toBeDefined())
    setX(3)
    await waitFor(() => expect(xy(point!)).toEqual([3, 0]))
  })

  test('can return Board components built on what it created', async () => {
    const { el } = await renderBoard<JXG.Tangent>((ref) => (
      <Board.Custom>
        {(board) => {
          const curve = board.create('functiongraph', [(x: number) => x * x])
          const glider = board.create('glider', [1, 1, curve])
          return <Board.Tangent at={glider}>{ref}</Board.Tangent>
        }}
      </Board.Custom>
    ))
    expect(slope(el())).toBeCloseTo(2)
  })

  test('is given the enclosing 3D view, and removes 3D elements through it', async () => {
    const [shown, setShown] = createSignal(true)
    const warnings: unknown[] = []
    const warn = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args)
    try {
      let point: JXG.Point3D | undefined
      render(() => (
        <Board boundingBox={[-10, 10, 10, -10]}>
          <Board.View3D position={[-6, -3]} size={[8, 8]} bounds={bounds}>
            <Show when={shown()}>
              <Board.Custom>
                {(_, view) => {
                  point = view!.create('point3d', [1, 2, 3])
                }}
              </Board.Custom>
            </Show>
          </Board.View3D>
        </Board>
      ))
      await waitFor(() => expect(point).toBeDefined())
      expect(xyz(point!)).toEqual([1, 2, 3])
      setShown(false)
      await waitFor(() => expect(point!.id in point!.board.objects).toBe(false))
      expect(warnings).toEqual([])
    } finally {
      console.warn = warn
    }
  })
})

describe('elements built on a point', () => {
  const named = (name: string) =>
    (
      Object.values(JXG.boards as Record<string, JXG.Board>).at(-1)!
        .objectsList as JXG.GeometryElement[]
    ).find((el) => el.name === name) as JXG.Point

  test.each<[string, (P: JXG.Point) => JSX.Element]>([
    ['Arrow', (P) => <Board.Arrow from={[0, 0]} to={P} />],
    ['Circle', (P) => <Board.Circle center={P} radius={1} />],
    ['Line', (P) => <Board.Line points={[[0, 0], P]} />],
    ['Polygon', (P) => <Board.Polygon points={[[0, 0], [1, 0], P]} />],
    ['Segment', (P) => <Board.Segment from={[0, 0]} to={P} />],
  ])('%s leaves the point where it is, and follows it', async (_, element) => {
    render(() => (
      <Board boundingBox={[-10, 10, 10, -10]}>
        <Board.Point name="Z" position={[2, 1]}>
          {element}
        </Board.Point>
      </Board>
    ))
    await waitFor(() => expect(named('Z')).toBeDefined())
    expect(xy(named('Z'))).toEqual([2, 1])
    drag(named('Z'), [3, -2])
    expect(xy(named('Z'))).toEqual([3, -2])
  })
})
