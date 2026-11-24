import { render, waitFor } from '@solidjs/testing-library'
import type { JSX } from '@solidjs/web'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createSignal, flush, Show } from 'solid-js'

// happy-dom lacks the SVG rendering methods JSXGraph calls.
Object.assign(SVGElement.prototype, {
  suspendRedraw: () => 0,
  unsuspendRedraw: () => {},
  unsuspendRedrawAll: () => {},
  forceRedraw: () => {},
  getBBox: () => ({ x: 0, y: 0, width: 0, height: 0 }),
})
const { Board } = await import('./Board')
const { Boundary } = await import('./Boundary')

type XY = { X(): number; Y(): number }
type XYZ = XY & { Z(): number }
// `+ 0` turns -0 into 0, which toEqual tells apart.
const xy = (p: XY) => [p.X() + 0, p.Y() + 0]
const xyz = (p: XYZ) => [p.X() + 0, p.Y() + 0, p.Z() + 0]
// Not in JSXGraph's types for every element that has it.
const value = (el: unknown) => (el as { Value(): number }).Value()

/** Simulates what the board does on a pointer drag, which happy-dom cannot dispatch. */
function drag(point: JXG.Point, to: [number, number]) {
  point.setPosition(JXG.COORDS_BY_USER, to)
  ;(
    point as unknown as { triggerEventHandlers(e: string[], a: unknown[]): void }
  ).triggerEventHandlers(['drag'], [{}])
}

/** Renders children in a board and returns a getter for the element a child hands to `ref`. */
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
      // A fixed radius, as the default is in screen pixels and the test board has no size.
      <Board.Angle points={points()} radius={1}>
        {ref}
      </Board.Angle>
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
