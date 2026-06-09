import { JSXGraph } from 'jsxgraph'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  createContext,
  createEffect,
  createSignal,
  deep,
  Errored,
  type JSX,
  merge,
  omit,
  onSettled,
  Show,
  useContext,
} from 'solid-js'

type Coordinate = number | (() => number)

export const BoardContext = createContext<() => JXG.Board | null>(() => null)

Reflect.set(globalThis, 'katex', katex)
JXG.Options.text.useKatex = true

export const Board = Object.assign(
  (
    props: Partial<JXG.BoardAttributes> & {
      children?: JSX.Element
      class?: string
    },
  ) => {
    const [board, setBoard] = createSignal<JXG.Board | null>(null)
    const [el, setEl] = createSignal<HTMLDivElement>()
    const attrs = merge(
      {
        boundingbox: [-10, 10, 10, -10],
        axis: true,
        showCopyright: false,
      } satisfies Partial<JXG.BoardAttributes>,
      omit(props, 'children', 'class'),
    )
    onSettled(() => {
      const board = JSXGraph.initBoard(el()!, attrs)
      setBoard(board)
      return () => JXG.JSXGraph.freeBoard(board)
    })

    return (
      <Errored
        fallback={(error) => (
          <div class="text-red-500">Failed to load the board: {String(error)}</div>
        )}
      >
        <div
          class={[
            'mx-auto my-4 h-175 w-175 rounded-xl border border-slate-200 shadow',
            props.class,
          ]}
          ref={setEl}
        />
        <BoardContext value={board}>
          <Show when={board()}>{props.children}</Show>
        </BoardContext>
      </Errored>
    )
  },
  {
    Angle: (
      props: {
        points: [
          [Coordinate, Coordinate] | JXG.Point,
          [Coordinate, Coordinate] | JXG.Point,
          [Coordinate, Coordinate] | JXG.Point,
        ]
        children?: (angle: JXG.Angle) => JSX.Element
      } & JXG.AngleAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return <Element type="angle" parent={props.points} attrs={attrs} children={props.children} />
    },
    Arc: (
      props: {
        points: [
          [Coordinate, Coordinate] | JXG.Point,
          [Coordinate, Coordinate] | JXG.Point,
          [Coordinate, Coordinate] | JXG.Point,
        ]
        children?: (arc: JXG.Arc) => JSX.Element
      } & JXG.ArcAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return (
        <Element
          type="arc"
          parent={props.points}
          attrs={{ withLabel: attrs.name ? true : false, ...attrs }}
          children={props.children}
        />
      )
    },
    Arrow: (
      props: {
        from: [Coordinate, Coordinate] | JXG.Point
        to: [Coordinate, Coordinate] | JXG.Point
        children?: (arrow: JXG.Arrow) => JSX.Element
      } & JXG.ArrowAttributes,
    ) => {
      const attrs = omit(props, 'from', 'to', 'children')
      return (
        <Element
          type="arrow"
          parent={[props.from, props.to]}
          attrs={{ withLabel: attrs.name ? true : false, ...attrs }}
          children={props.children}
        />
      )
    },
    Circle: (
      props: {
        center: [Coordinate, Coordinate] | JXG.Point
        children?: (circle: JXG.Circle) => JSX.Element
      } & Omit<JXG.CircleAttributes, 'center'> &
        (
          | {
              radius: Coordinate
              through?: never
            }
          | {
              radius?: never
              through: [Coordinate, Coordinate] | JXG.Point
            }
        ),
    ) => {
      const attrs = omit(props, 'center', 'radius', 'through', 'children')
      return (
        <Element
          type="circle"
          parent={[props.center, props.radius ?? props.through]}
          children={props.children}
          attrs={attrs}
        />
      )
    },
    Glider: (
      props: {
        start: [Coordinate, Coordinate] | JXG.Point
        on: JXG.GeometryElement
        children?: (glider: JXG.Glider) => JSX.Element
      } & JXG.GliderAttributes,
    ) => {
      const attrs = omit(props, 'start', 'on', 'children')
      return (
        <Element
          type="glider"
          parent={[...(Array.isArray(props.start) ? props.start : [props.start]), props.on]}
          attrs={attrs}
          children={props.children}
        />
      )
    },
    Line: (
      props: {
        points: [[Coordinate, Coordinate] | JXG.Point, [Coordinate, Coordinate] | JXG.Point]
        children?: (line: JXG.Line) => JSX.Element
      } & JXG.LineAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return <Element type="line" parent={props.points} attrs={attrs} children={props.children} />
    },
    Point: (
      props: {
        position: [Coordinate, Coordinate]
        children?: (point: JXG.Point) => JSX.Element
      } & JXG.PointAttributes,
    ) => {
      const attrs = omit(props, 'position', 'children')
      return (
        <Element type="point" parent={props.position} attrs={attrs} children={props.children} />
      )
    },
    Plot: (
      props: {
        fn: (x: number) => number
        children?: (plot: JXG.Functiongraph) => JSX.Element
      } & JXG.FunctiongraphAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'children')
      return (
        <Element type="functiongraph" parent={[props.fn]} children={props.children} attrs={attrs} />
      )
    },
    Polygon: (
      props: {
        points: Array<[Coordinate, Coordinate] | JXG.Point>
        children?: (polygon: JXG.Polygon) => JSX.Element
      } & JXG.PolygonAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return (
        <Element type="polygon" parent={props.points} attrs={attrs} children={props.children} />
      )
    },
    Sector: (
      props: {
        points: [
          [Coordinate, Coordinate] | JXG.Point,
          [Coordinate, Coordinate] | JXG.Point,
          [Coordinate, Coordinate] | JXG.Point,
        ]
        children?: (sector: JXG.Sector) => JSX.Element
      } & JXG.SectorAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return <Element type="sector" parent={props.points} attrs={attrs} children={props.children} />
    },
    Segment: (
      props: {
        from: [Coordinate, Coordinate] | JXG.Point
        to: [Coordinate, Coordinate] | JXG.Point
        children?: (line: JXG.Segment) => JSX.Element
      } & JXG.SegmentAttributes,
    ) => {
      const attrs = omit(props, 'from', 'to', 'children')
      return (
        <Element
          type="segment"
          parent={[props.from, props.to]}
          attrs={{ withLabel: attrs.name ? true : false, ...attrs }}
          children={props.children}
        />
      )
    },
  },
)

function Element<T extends JXG.GeometryElement>(props: {
  type: string
  parent: unknown[]
  attrs?: Record<string, unknown>
  children?: (el: T) => JSX.Element
  onParentChange?: (el: T, parent: unknown[]) => void
}) {
  const board = useContext(BoardContext)
  const [el, setEl] = createSignal<T>()

  onSettled(() => {
    const created = board()?.create(props.type, props.parent, props.attrs ?? {}) as any
    setEl(created)
    return () => {
      board()?.removeObject(created)
    }
  })

  createEffect(
    () => [el(), deep(props.parent)] as const,
    ([el, position]) => {
      if (el) {
        props.onParentChange?.(el, position)
      }
    },
  )

  createEffect(
    () => deep(props.attrs ?? {}),
    (attrs) => {
      el()?.setAttribute(attrs)
    },
  )

  return <Show when={el()}>{props.children?.(el()!)}</Show>
}
