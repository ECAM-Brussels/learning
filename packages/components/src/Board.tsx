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

    // JSXGraph's types name these radiusPoint and anglePoint, which don't exist at runtime.
    interface Sector {
      radiuspoint: JXG.Point
      anglepoint: JXG.Point
    }

    interface Integral {
      curveLeft: JXG.Glider
      curveRight: JXG.Glider
    }

    interface Circle {
      setRadius(radius: string | number | (() => number)): this
    }

    // At runtime a GeometryElement, but with its own `setPosition`.
    interface Point3D extends Omit<GeometryElement, 'setPosition'> {
      setPosition(coords: [number, number, number], noevent?: boolean): this
      element2D: Point
    }

    interface View3D {
      objects: Record<string, GeometryElement>
      removeObject(object: unknown): this
    }

    interface Functiongraph {
      generateTerm(
        varname: string,
        xterm: string | number | ((x: number) => number),
        yterm: string | number | ((x: number) => number),
        min?: string | number | (() => number),
        max?: string | number | (() => number),
      ): void
    }
  }
}

export const BoardContext = createContext<() => JXG.Board | null>(() => null)
export const View3DContext = createContext<() => JXG.View3D | null>(() => null)

type Coords3D = [number, number, number]

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
            'mx-auto my-4 rounded-xl border border-slate-200 bg-white shadow',
            props.class ?? 'h-175 w-175',
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
        /** A point on the first side, the vertex, and a point on the second side. */
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
        /** The center, the start of the arc, and a point giving the direction of its end. */
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
        <Element type="arc" parent={props.points} attrs={attrs}>
          {(arc: JXG.Arc) => {
            createEffect(
              () => deep(props.points),
              ([center, radius, angle]) => {
                arc.center.moveTo(center)
                arc.radiuspoint.moveTo(radius)
                arc.anglepoint.moveTo(angle)
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
        <Element type="arrow" parent={[props.from, props.to]} attrs={attrs}>
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
    Axis: (
      props: {
        from: [number, number] | JXG.Point
        to: [number, number] | JXG.Point
        children?: (axis: JXG.Axis) => JSX.Element
      } & JXG.AxisAttributes,
    ) => {
      const attrs = omit(props, 'from', 'to', 'children')
      return (
        <Element type="axis" parent={[props.from, props.to]} attrs={attrs}>
          {(axis: JXG.Axis) => {
            createEffect(
              () => [props.from, props.to] as const,
              ([from, to]) => {
                axis.point1.moveTo(from)
                axis.point2.moveTo(to)
              },
            )
            return props.children?.(axis)
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
              ([center, radius]) => {
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
        position: [number, number] | JXG.Point
        on: JXG.GeometryElement
        children?: (glider: JXG.Glider) => JSX.Element
        onDrag?: (glider: JXG.Glider) => void
      } & JXG.GliderAttributes,
    ) => {
      const attrs = omit(props, 'position', 'on', 'children', 'onDrag')
      return (
        <Element
          type="glider"
          parent={[
            ...(Array.isArray(props.position) ? props.position : [props.position]),
            props.on,
          ]}
          attrs={attrs}
        >
          {(glider: JXG.Glider) => {
            createEffect(
              () => props.onDrag,
              (onDrag) => {
                if (onDrag) {
                  glider.on('drag', () => {
                    onDrag(glider)
                  })
                }
              },
            )
            createEffect(
              () => props.position,
              (position) => {
                glider.moveTo(position)
              },
            )
            return props.children?.(glider)
          }}
        </Element>
      )
    },
    Integral: (
      props: {
        curve: JXG.Curve
        domain: [number, number]
        children?: (integral: JXG.Integral) => JSX.Element
      } & JXG.IntegralAttributes,
    ) => {
      const attrs = omit(props, 'curve', 'domain', 'children')
      return (
        <Element type="integral" parent={[props.domain, props.curve]} attrs={attrs}>
          {(integral: JXG.Integral) => {
            createEffect(
              () => [props.curve, ...props.domain] as const,
              ([curve, a, b]) => {
                integral.curveLeft.moveTo([a, curve.Y(a, false)])
                integral.curveRight.moveTo([b, curve.Y(b, false)])
                integral.update()
                integral.updateRenderer()
                integral.board?.update()
              },
            )
            return props.children?.(integral)
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
      const attrs = omit(props, 'position', 'children', 'onDrag')
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
        domain?: [number, number]
        children?: (plot: JXG.Functiongraph) => JSX.Element
      } & JXG.FunctiongraphAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'children')
      return (
        <Element type="functiongraph" parent={[props.fn, ...(props.domain ?? [])]} attrs={attrs}>
          {(plot: JXG.Functiongraph) => {
            createEffect(
              () => [props.fn, props.domain] as const,
              ([fn, domain]) => {
                plot.generateTerm('x', 'x', fn, domain?.[0], domain?.[1])
                plot.update()
                plot.updateRenderer()
                plot.board?.update()
              },
            )
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
    RiemannSum: (
      props: {
        f: (x: number) => number
        n: number
        type?: JXG.RiemannSumTypeOrFunction
        domain: [number, number]
        children?: (riemannsum: JXG.Riemannsum) => JSX.Element
      } & JXG.RiemannsumAttributes,
    ) => {
      const attrs = omit(props, 'f', 'n', 'type', 'domain', 'children')
      return (
        <Element
          type="riemannsum"
          parent={[
            (x: number) => props.f(x),
            () => props.n,
            () => props.type ?? 'left',
            () => props.domain[0],
            () => props.domain[1],
          ]}
          attrs={attrs}
        >
          {(riemannsum: JXG.Riemannsum) => {
            createEffect(
              () => [props.f, props.n, props.type, props.domain] as const,
              () => {
                riemannsum.update()
                riemannsum.updateRenderer()
                riemannsum.board?.update()
              },
            )
            return props.children?.(riemannsum)
          }}
        </Element>
      )
    },
    Sector: (
      props: {
        /** The center, the start of the arc, and a point giving the direction of its end. */
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
              () => deep(props.points),
              ([center, radius, angle]) => {
                sector.center.moveTo(center)
                sector.radiuspoint.moveTo(radius)
                sector.anglepoint.moveTo(angle)
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
        <Element type="segment" parent={[props.from, props.to]} attrs={attrs}>
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
    View3D: (
      props: {
        /** Lower-left corner of the view on the board. */
        position: [number, number]
        size: [number, number]
        bounds: [[number, number], [number, number], [number, number]]
        children?: JSX.Element
      } & JXG.View3DAttributes,
    ) => {
      const attrs = omit(props, 'position', 'size', 'bounds', 'children')
      return (
        <Element
          type="view3d"
          parent={[props.position, props.size, props.bounds]}
          attrs={attrs}
          // Removing the view from the board would remove its 3D elements the wrong way.
          beforeRemove={(view: JXG.View3D) => view.removeObject(Object.values(view.objects))}
        >
          {(view: JXG.View3D) => {
            createEffect(
              () => deep(props.bounds),
              (bounds) => {
                Reflect.set(view, 'bbox3D', bounds)
                view.board.update()
              },
            )
            return <View3DContext value={() => view}>{props.children}</View3DContext>
          }}
        </Element>
      )
    },
    Point3D: (
      props: {
        position: Coords3D
        children?: (point: JXG.Point3D) => JSX.Element
        onDrag?: (point: JXG.Point3D) => void
      } & JXG.Point3DAttributes,
    ) => {
      const attrs = omit(props, 'position', 'children', 'onDrag')
      return (
        <Element type="point3d" view parent={props.position} attrs={attrs}>
          {(point: JXG.Point3D) => {
            createEffect(
              () => props.onDrag,
              (onDrag) => {
                if (!onDrag) return
                // The drag is on the 2D projection, and fires before the board recomputes the 3D coordinates.
                const handler = () => {
                  point.update()
                  onDrag(point)
                }
                point.element2D.on('drag', handler)
                return () => point.element2D.off('drag', handler)
              },
            )
            createEffect(
              () => deep(props.position),
              (position) => {
                point.setPosition(position)
                point.board.update()
              },
            )
            return props.children?.(point)
          }}
        </Element>
      )
    },
    /** An arrow between two 3D points; set `lastArrow: false` for a plain segment. */
    Vector3D: (
      props: {
        from: Coords3D | JXG.Point3D
        to: Coords3D | JXG.Point3D
        children?: (vector: JXG.Line3D) => JSX.Element
      } & JXG.Line3DAttributes,
    ) => {
      const attrs = merge({ lastArrow: true }, omit(props, 'from', 'to', 'children'))
      return (
        <Element type="line3d" view parent={[props.from, props.to]} attrs={attrs}>
          {(vector: JXG.Line3D) => {
            // Points given as elements move on their own; only coordinates are ours to update.
            const { point1, point2 } = vector as unknown as Record<'point1' | 'point2', JXG.Point3D>
            createEffect(
              () => [deep(props.from), deep(props.to)] as const,
              ([from, to]) => {
                if (Array.isArray(from)) point1.setPosition(from)
                if (Array.isArray(to)) point2.setPosition(to)
                vector.board.update()
              },
            )
            return props.children?.(vector)
          }}
        </Element>
      )
    },
    Text: (
      props: {
        position: [number, number]
        content: string | number
        children?: (text: JXG.Text) => JSX.Element
      } & JXG.TextAttributes,
    ) => {
      const attrs = omit(props, 'position', 'content', 'children')
      return (
        <Element
          type="text"
          parent={[props.position[0], props.position[1], `${props.content}`]}
          attrs={attrs}
        >
          {(text: JXG.Text) => {
            createEffect(
              () => props.position,
              (position) => {
                text.moveTo(position)
              },
            )
            createEffect(
              () => props.content,
              (content) => {
                text.setText(`${content}`)
              },
            )
            return props.children?.(text)
          }}
        </Element>
      )
    },
  },
)

function Element<T extends Pick<JXG.GeometryElement, 'setAttribute' | 'update'>>(props: {
  type: string
  /** Create the element in the enclosing `View3D` rather than on the board. */
  view?: boolean
  parent: unknown[]
  attrs?: Record<string, unknown>
  children?: (el: T) => JSX.Element
  onParentChange?: (el: T, parent: unknown[]) => void
  beforeRemove?: (el: T) => void
}) {
  const board = useContext(BoardContext)
  const view = useContext(View3DContext)
  const container = () => (props.view ? view() : board())
  const [el, setEl] = createSignal<T>()

  const attrs = () => {
    const source = props.attrs ?? {}
    const next: Record<string, unknown> = {}
    for (const key in source) {
      next[key] = source[key]
    }
    return next
  }

  onSettled(() => {
    const parent = container()
    if (!parent)
      throw new Error(`<${props.type}> must be placed inside a ${props.view ? 'View3D' : 'Board'}`)
    const created = (parent.create as (...args: unknown[]) => T)(props.type, props.parent, attrs())
    setEl(() => created)
    return () => {
      props.beforeRemove?.(created)
      parent.removeObject(created as unknown as JXG.GeometryElement)
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

  createEffect(attrs, (attrs) => {
    el()?.setAttribute(attrs)
    el()?.update()
  })

  return <Show when={el()}>{props.children?.(el()!)}</Show>
}

export default Board
