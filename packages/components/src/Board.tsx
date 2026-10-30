import type { JSX } from '@solidjs/web'
import { JSXGraph } from 'jsxgraph'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  createContext,
  createEffect,
  createSignal,
  deep,
  merge,
  omit,
  onSettled,
  Show,
  snapshot,
  useContext,
} from 'solid-js'
import { Boundary } from './Boundary'

declare global {
  namespace JXG {
    interface Angle {
      radiuspoint: JXG.Point
      anglepoint: JXG.Point
    }

    interface Circle {
      setRadius(radius: string | number | (() => number)): this
    }
  }
}

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
        showCopyright: false,
      } satisfies Partial<JXG.BoardAttributes>,
      omit(props, 'children', 'class'),
    )
    onSettled(() => {
      const board = JSXGraph.initBoard(el()!, { ...snapshot(attrs) })
      setBoard(board)
      return () => JXG.JSXGraph.freeBoard(board)
    })

    return (
      <Boundary>
        <div
          class={[
            'mx-auto my-4 h-175 w-175 rounded-xl border border-slate-200 bg-white shadow',
            props.class,
          ]}
          ref={setEl}
        />
        <BoardContext value={board}>
          <Show when={board()}>{props.children}</Show>
        </BoardContext>
      </Boundary>
    )
  },
  {
    Angle: (
      props: {
        points: [
          [number, number] | JXG.Point,
          [number, number] | JXG.Point,
          [number, number] | JXG.Point,
        ]
        children?: (angle: JXG.Angle) => JSX.Element
      } & JXG.AngleAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return (
        <Element type="angle" parent={props.points} attrs={attrs}>
          {(angle: JXG.Angle) => {
            createEffect(
              () => deep(props.points),
              ([p1, p2, p3]) => {
                angle.radiuspoint.moveTo(p1)
                angle.center.moveTo(p2)
                angle.anglepoint.moveTo(p3)
              },
            )
            return props.children?.(angle)
          }}
        </Element>
      )
    },
    Arc: (
      props: {
        points: [
          [number, number] | JXG.Point,
          [number, number] | JXG.Point,
          [number, number] | JXG.Point,
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
        >
          {(arc: JXG.Arc) => {
            createEffect(
              () => props.points,
              ([p1, p2, p3]) => {
                arc.radiuspoint.moveTo(p1)
                arc.center.moveTo(p2)
                arc.anglepoint.moveTo(p3)
              },
            )
            return props.children?.(arc)
          }}
        </Element>
      )
    },
    Arrow: (
      props: {
        from: [number, number] | JXG.Point
        to: [number, number] | JXG.Point
        children?: (arrow: JXG.Arrow) => JSX.Element
      } & JXG.ArrowAttributes,
    ) => {
      const attrs = omit(props, 'from', 'to', 'children')
      return (
        <Element
          type="arrow"
          parent={[props.from, props.to]}
          attrs={{ withLabel: attrs.name ? true : false, ...attrs }}
        >
          {(arrow: JXG.Arrow) => {
            createEffect(
              () => [props.from, props.to] as const,
              ([from, to]) => {
                arrow.point1.moveTo(from)
                arrow.point2.moveTo(to)
              },
            )
            return props.children?.(arrow)
          }}
        </Element>
      )
    },
    Circle: (
      props: {
        center: [number, number] | JXG.Point
        children?: (circle: JXG.Circle) => JSX.Element
      } & Omit<JXG.CircleAttributes, 'center'> &
        (
          | {
              radius: number
              through?: never
            }
          | {
              radius?: never
              through: [number, number] | JXG.Point
            }
        ),
    ) => {
      const attrs = omit(props, 'center', 'radius', 'through', 'children')
      return (
        <Element type="circle" parent={[props.center, props.radius ?? props.through]} attrs={attrs}>
          {(circle: JXG.Circle) => {
            createEffect(
              () => [props.center, props.radius, props.through] as const,
              ([center, radius, through]) => {
                circle.center.moveTo(center)
                if (radius) {
                  circle.setRadius(radius)
                }
              },
            )
            return props.children?.(circle)
          }}
        </Element>
      )
    },
    Glider: (
      props: {
        start: [number, number] | JXG.Point
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
        >
          {(glider: JXG.Glider) => {
            createEffect(
              () => props.start,
              (start) => {
                glider.moveTo(start)
              },
            )
            return props.children?.(glider)
          }}
        </Element>
      )
    },
    Line: (
      props: {
        points: [[number, number] | JXG.Point, [number, number] | JXG.Point]
        children?: (line: JXG.Line) => JSX.Element
      } & JXG.LineAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return (
        <Element type="line" parent={props.points} attrs={attrs}>
          {(line: JXG.Line) => {
            createEffect(
              () => props.points,
              ([p1, p2]) => {
                line.point1.moveTo(p1)
                line.point2.moveTo(p2)
              },
            )
            return props.children?.(line)
          }}
        </Element>
      )
    },
    Point: (
      props: {
        position: [number, number]
        children?: (point: JXG.Point) => JSX.Element
        onDrag?: (point: JXG.Point) => void
      } & JXG.PointAttributes,
    ) => {
      const attrs = omit(props, 'position', 'children')
      return (
        <Element type="point" parent={props.position} attrs={attrs}>
          {(point: JXG.Point) => {
            createEffect(
              () => props.onDrag,
              (onDrag) => {
                if (onDrag) {
                  point.on('drag', () => {
                    onDrag(point)
                  })
                }
              },
            )
            createEffect(
              () => props.position,
              (position) => {
                point.moveTo(position)
              },
            )
            return props.children?.(point)
          }}
        </Element>
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
        <Element type="functiongraph" parent={[props.fn]} attrs={attrs}>
          {(plot: JXG.Functiongraph) => {
            return props.children?.(plot)
          }}
        </Element>
      )
    },
    Polygon: (
      props: {
        points: Array<[number, number] | JXG.Point>
        children?: (polygon: JXG.Polygon) => JSX.Element
      } & JXG.PolygonAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return (
        <Element type="polygon" parent={props.points} attrs={attrs}>
          {(polygon: JXG.Polygon) => {
            createEffect(
              () => props.points,
              (points) => {
                for (let i = 0; i < Math.min(points.length, polygon.vertices.length); i++) {
                  polygon.vertices[i]!.moveTo(points[i]!)
                }
              },
            )
            return props.children?.(polygon)
          }}
        </Element>
      )
    },
    Sector: (
      props: {
        points: [
          [number, number] | JXG.Point,
          [number, number] | JXG.Point,
          [number, number] | JXG.Point,
        ]
        children?: (sector: JXG.Sector) => JSX.Element
      } & JXG.SectorAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return (
        <Element type="sector" parent={props.points} attrs={attrs}>
          {(sector: JXG.Sector) => {
            createEffect(
              () => props.points,
              ([p1, p2, p3]) => {
                sector.radiusPoint.moveTo(p1)
                sector.center.moveTo(p2)
                sector.anglePoint.moveTo(p3)
              },
            )
            return props.children?.(sector)
          }}
        </Element>
      )
    },
    Segment: (
      props: {
        from: [number, number] | JXG.Point
        to: [number, number] | JXG.Point
        children?: (line: JXG.Segment) => JSX.Element
      } & JXG.SegmentAttributes,
    ) => {
      const attrs = omit(props, 'from', 'to', 'children')
      return (
        <Element
          type="segment"
          parent={[props.from, props.to]}
          attrs={{ withLabel: attrs.name ? true : false, ...attrs }}
        >
          {(segment: JXG.Segment) => {
            createEffect(
              () => [props.from, props.to] as const,
              ([from, to]) => {
                segment.point1.moveTo(from)
                segment.point2.moveTo(to)
              },
            )
            return props.children?.(segment)
          }}
        </Element>
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

export default Board
