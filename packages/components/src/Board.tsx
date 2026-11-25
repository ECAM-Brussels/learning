import type { JSX } from '@solidjs/web'
import { JSXGraph } from 'jsxgraph'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  deep,
  merge,
  omit,
  onCleanup,
  onSettled,
  Show,
  snapshot,
  untrack,
  useContext,
} from 'solid-js'
import { Boundary } from './Boundary'

declare global {
  namespace JXG {
    /** Options merged into a board's when created with `theme: name`. */
    const themes: Record<string, unknown>

    interface BoardAttributes {
      theme?: string
    }

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

    interface Slider {
      point1: JXG.Point
      point2: JXG.Point
    }

    interface Curve {
      /** The domain of an implicit curve, or null for the whole board. */
      domain: [[number, number], [number, number]] | null
    }

    // Not in JSXGraph's types.
    type Surface3D = Omit<GeometryElement, 'setPosition'>
    interface Surface3DAttributes extends GeometryElementAttributes {
      stepsU?: number
      stepsV?: number
    }

    // Not in JSXGraph's types, although view3d accepts them.
    interface View3DAttributes {
      az?: { slider?: SliderAttributes & { start?: number } }
      el?: { slider?: SliderAttributes & { start?: number } }
      depthOrder?: { enabled?: boolean }
    }

    // Not in JSXGraph's types, although point3d accepts the attributes of a point.
    interface Point3DAttributes {
      size?: number
      label?: LabelOptions
    }

    // Not in JSXGraph's types, although polygon3d accepts them.
    interface Polygon3DAttributes {
      vertices?: Point3DAttributes
      borders?: Line3DAttributes
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

type Coords = [number, number]
type Coords3D = [number, number, number]
type Domain2D = [[number, number], [number, number]]

/** Tracks the items of an array prop; other values (absent props, JSXGraph elements) are tracked as a whole. */
const deepArray = <T,>(value: T): T => (Array.isArray(value) ? deep(value) : value)

/** Redraws after a change that JSXGraph picks up through the functions it was given. */
const refresh = (el: { board: JXG.Board }) => {
  el.board.update()
}

/**
 * JSXGraph options keyed by element type, as in `JXG.Options`.
 * `elements` applies to every element, for what its type doesn't set itself.
 */
export type BoardOptions = {
  board?: Partial<JXG.BoardAttributes>
  elements?: JXG.GeometryElementAttributes
  label?: JXG.LabelOptions
  ticks?: JXG.TicksAttributes
  grid?: JXG.GridAttributes
  angle?: JXG.AngleAttributes
  arc?: JXG.ArcAttributes
  arrow?: JXG.ArrowAttributes
  axis?: JXG.AxisAttributes
  circle?: JXG.CircleAttributes
  curve?: JXG.CurveAttributes
  functiongraph?: JXG.FunctiongraphAttributes
  glider?: JXG.GliderAttributes
  implicitcurve?: JXG.CurveAttributes
  inequality?: JXG.InequalityAttributes
  integral?: JXG.IntegralAttributes
  line?: JXG.LineAttributes
  normal?: JXG.NormalAttributes
  point?: JXG.PointAttributes
  polygon?: JXG.PolygonAttributes
  riemannsum?: JXG.RiemannsumAttributes
  sector?: JXG.SectorAttributes
  segment?: JXG.SegmentAttributes
  slider?: JXG.SliderAttributes
  slopefield?: JXG.CurveAttributes
  tangent?: JXG.TangentAttributes
  text?: JXG.TextAttributes
  vectorfield?: JXG.CurveAttributes
  view3d?: JXG.View3DAttributes
  point3d?: JXG.Point3DAttributes
  line3d?: JXG.Line3DAttributes
  plane3d?: JXG.Plane3DAttributes
  curve3d?: JXG.Curve3DAttributes
  surface3d?: JXG.Surface3DAttributes
}

const BoardDefaultsContext = createContext<() => BoardOptions>(() => ({}))

/**
 * Sets the defaults of the boards inside it, e.g. in a layout for every board of a course.
 * Options of an inner `BoardDefaults` are merged over those of an outer one.
 * Props of a board and of its elements still win; a board reads its defaults when it is created.
 */
export function BoardDefaults(props: BoardOptions & { children?: JSX.Element }) {
  const outer = useContext(BoardDefaultsContext)
  const own = omit(props, 'children')
  const options = createMemo(() => mergeOptions(outer(), own))
  return <BoardDefaultsContext value={options}>{props.children}</BoardDefaultsContext>
}

function mergeOptions<T extends Record<string, unknown>>(
  base: T,
  over: Record<string, unknown>,
): T {
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(over)) {
    const current = merged[key]
    merged[key] =
      isPlainObject(value) && isPlainObject(current) ? mergeOptions(current, value) : value
  }
  return merged as T
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype

let themes = 0

/**
 * Creates a board with the defaults in context, passed as a JSXGraph theme:
 * initBoard merges a theme into the board's options before it creates anything (e.g. its axes).
 */
function initBoard(
  container: HTMLDivElement,
  attributes: Partial<JXG.BoardAttributes>,
  defaults: BoardOptions,
) {
  if (Object.keys(defaults).length === 0) return JSXGraph.initBoard(container, attributes)
  const name = `board-defaults-${themes++}`
  const base = attributes.theme ? JXG.themes[attributes.theme] : undefined
  JXG.themes[name] = mergeOptions(isPlainObject(base) ? base : {}, defaults)
  try {
    return JSXGraph.initBoard(container, { ...attributes, theme: name })
  } finally {
    // The board has copied the theme into its own options.
    delete JXG.themes[name]
  }
}

Reflect.set(globalThis, 'katex', katex)
JXG.Options.text.useKatex = true

export const Board = Object.assign(
  (
    props: Partial<JXG.BoardAttributes> & {
      children?: JSX.Element
      class?: string
    },
  ) => {
    const defaults = useContext(BoardDefaultsContext)
    const [board, setBoard] = createSignal<JXG.Board | null>(null)
    const [el, setEl] = createSignal<HTMLDivElement>()
    const attrs = merge(
      {
        showCopyright: false,
      } satisfies Partial<JXG.BoardAttributes>,
      omit(props, 'children', 'class'),
    )
    onSettled(() => {
      const board = initBoard(el()!, { ...snapshot(attrs) }, snapshot(defaults()))
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
              () => deepArray(props.points),
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
              () => deepArray(props.points),
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
        /** The whole board's width if omitted. */
        domain?: Coords
        children?: (plot: JXG.Functiongraph) => JSX.Element
      } & JXG.FunctiongraphAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'children')
      // Fixed wrappers keep plot.Y the same function, which elements built on the plot (e.g. Derivative) rely on.
      return (
        <Element
          type="functiongraph"
          parent={[
            (x: number) => props.fn(x),
            ...(props.domain
              ? [() => props.domain?.[0] ?? NaN, () => props.domain?.[1] ?? NaN]
              : []),
          ]}
          attrs={attrs}
        >
          {(plot: JXG.Functiongraph) => {
            createEffect(
              () => [props.fn, deepArray(props.domain)],
              () => refresh(plot),
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
              () => [props.f, props.n, props.type, deepArray(props.domain)] as const,
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
              () => deepArray(props.points),
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
    Slider: (
      props: {
        from: Coords
        to: Coords
        min: number
        max: number
        value: number
        onChange?: (value: number) => void
        children?: (slider: JXG.Slider) => JSX.Element
      } & JXG.SliderAttributes,
    ) => {
      const attrs = omit(props, 'from', 'to', 'min', 'max', 'value', 'onChange', 'children')
      return (
        <Element
          type="slider"
          parent={[props.from, props.to, [props.min, props.value, props.max]]}
          attrs={attrs}
        >
          {(slider: JXG.Slider) => {
            createEffect(
              () =>
                [
                  deepArray(props.from),
                  deepArray(props.to),
                  props.min,
                  props.max,
                  props.value,
                ] as const,
              ([from, to, min, max, value]) => {
                slider.point1.moveTo(from)
                slider.point2.moveTo(to)
                slider.setMin(min).setMax(max)
                // Setting the value it already has would undo the snapping of a drag.
                if (slider.Value() !== value) slider.setValue(value)
                refresh(slider)
              },
            )
            createEffect(
              () => props.onChange,
              (onChange) => {
                if (!onChange) return
                const handler = () => onChange(slider.Value())
                slider.on('drag', handler)
                return () => slider.off('drag', handler)
              },
            )
            return props.children?.(slider)
          }}
        </Element>
      )
    },
    Tangent: (
      props: {
        at: JXG.Glider
        children?: (tangent: JXG.Tangent) => JSX.Element
      } & JXG.TangentAttributes,
    ) => {
      const attrs = omit(props, 'at', 'children')
      return (
        <Element type="tangent" parent={[props.at]} attrs={attrs}>
          {(tangent: JXG.Tangent) => props.children?.(tangent)}
        </Element>
      )
    },
    Normal: (
      props: {
        at: JXG.Glider
        children?: (normal: JXG.Normal) => JSX.Element
      } & JXG.NormalAttributes,
    ) => {
      const attrs = omit(props, 'at', 'children')
      return (
        <Element type="normal" parent={[props.at]} attrs={attrs}>
          {(normal: JXG.Normal) => props.children?.(normal)}
        </Element>
      )
    },
    Curve: (
      props: {
        fn: (t: number) => Coords
        domain: Coords
        children?: (curve: JXG.Curve) => JSX.Element
      } & JXG.CurveAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'children')
      return (
        <Element
          type="curve"
          parent={[
            (t: number) => props.fn(t)[0],
            (t: number) => props.fn(t)[1],
            () => props.domain[0],
            () => props.domain[1],
          ]}
          attrs={attrs}
        >
          {(curve: JXG.Curve) => {
            createEffect(
              () => [props.fn, deepArray(props.domain)],
              () => refresh(curve),
            )
            return props.children?.(curve)
          }}
        </Element>
      )
    },
    PolarCurve: (
      props: {
        r: (theta: number) => number
        /** The origin if omitted. */
        center?: Coords
        /** [0, 2π] if omitted. */
        domain?: Coords
        children?: (curve: JXG.Curve) => JSX.Element
      } & JXG.CurveAttributes,
    ) => {
      const attrs = omit(props, 'r', 'center', 'domain', 'children')
      return (
        <Element
          type="curve"
          parent={[
            (theta: number) => props.r(theta),
            [() => props.center?.[0] ?? 0, () => props.center?.[1] ?? 0],
            () => props.domain?.[0] ?? 0,
            () => props.domain?.[1] ?? 2 * Math.PI,
          ]}
          attrs={attrs}
        >
          {(curve: JXG.Curve) => {
            createEffect(
              () => [props.r, deepArray(props.center), deepArray(props.domain)],
              () => refresh(curve),
            )
            return props.children?.(curve)
          }}
        </Element>
      )
    },
    /** The derivative of a curve, computed numerically. */
    Derivative: (
      props: {
        of: JXG.Curve
        children?: (derivative: JXG.Curve) => JSX.Element
      } & JXG.CurveAttributes,
    ) => {
      const attrs = omit(props, 'of', 'children')
      return (
        <Element type="derivative" parent={[props.of]} attrs={attrs}>
          {(derivative: JXG.Curve) => {
            // JSXGraph copies the curve's domain when it creates the derivative.
            derivative.minX = () => props.of.minX()
            derivative.maxX = () => props.of.maxX()
            return props.children?.(derivative)
          }}
        </Element>
      )
    },
    /** The curve fn(x, y) = 0. */
    ImplicitCurve: (
      props: {
        fn: (x: number, y: number) => number
        /** The whole board if omitted. */
        domain?: Domain2D
        children?: (curve: JXG.Curve) => JSX.Element
      } & JXG.CurveAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'children')
      return (
        <Element
          type="implicitcurve"
          parent={[(x: number, y: number) => props.fn(x, y)]}
          attrs={attrs}
        >
          {(curve: JXG.Curve) => {
            // A domain given as parents could be mistaken for the partial derivatives.
            createEffect(
              () => [props.fn, deepArray(props.domain)] as const,
              ([, domain]) => {
                curve.domain = domain ?? null
                refresh(curve)
              },
            )
            return props.children?.(curve)
          }}
        </Element>
      )
    },
    VectorField: (
      props: {
        fn: (x: number, y: number) => Coords
        domain: Domain2D
        /** Number of arrows along each axis, 10 if omitted. */
        steps?: number
        children?: (field: JXG.Curve) => JSX.Element
      } & JXG.CurveAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'steps', 'children')
      return (
        <Element
          type="vectorfield"
          parent={fieldParents(props, (x, y) => props.fn(x, y))}
          attrs={attrs}
        >
          {(field: JXG.Curve) => {
            createEffect(
              () => [props.fn, deepArray(props.domain), props.steps],
              () => refresh(field),
            )
            return props.children?.(field)
          }}
        </Element>
      )
    },
    /** Segments of slope fn(x, y) on a grid over the domain, for y' = fn(x, y). */
    SlopeField: (
      props: {
        fn: (x: number, y: number) => number
        domain: Domain2D
        /** Number of segments along each axis, 10 if omitted. */
        steps?: number
        children?: (field: JXG.Curve) => JSX.Element
      } & JXG.CurveAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'steps', 'children')
      return (
        <Element
          type="slopefield"
          parent={fieldParents(props, (x, y) => props.fn(x, y))}
          attrs={attrs}
        >
          {(field: JXG.Curve) => {
            createEffect(
              () => [props.fn, deepArray(props.domain), props.steps],
              () => refresh(field),
            )
            return props.children?.(field)
          }}
        </Element>
      )
    },
    /** The region below a line or the graph of a function, or above it with `inverse`. */
    Inequality: (
      props: {
        of: JXG.Line | JXG.Curve
        children?: (region: JXG.Inequality) => JSX.Element
      } & JXG.InequalityAttributes & { inverse?: boolean },
    ) => {
      const attrs = omit(props, 'of', 'children')
      return (
        <Element type="inequality" parent={[props.of]} attrs={attrs}>
          {(region: JXG.Inequality) => props.children?.(region)}
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
              () => deepArray(props.bounds),
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
        /** A 3D element (surface, curve, line, plane…) the point slides on. */
        on?: Pick<JXG.GeometryElement, 'board' | 'id'>
        children?: (point: JXG.Point3D) => JSX.Element
        onDrag?: (point: JXG.Point3D) => void
      } & JXG.Point3DAttributes,
    ) => {
      const attrs = omit(props, 'position', 'on', 'children', 'onDrag')
      // Outside JSX, where the compiler would wrap the condition in a memo,
      // which Element can't create since it reads its parents in an effect callback.
      const parent = () => (props.on ? [props.position, props.on] : props.position)
      return (
        <Element type="point3d" view parent={parent()} attrs={attrs}>
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
              () => deepArray(props.position),
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
              () => [deepArray(props.from), deepArray(props.to)] as const,
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
    /** The surface z = fn(x, y) over the domain. */
    Plot3D: (
      props: {
        fn: (x: number, y: number) => number
        domain: Domain2D
        children?: (surface: JXG.Surface3D) => JSX.Element
      } & JXG.Surface3DAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'children')
      return (
        <Element
          type="functiongraph3d"
          view
          parent={[
            (x: number, y: number) => props.fn(x, y),
            liveRange(() => props.domain[0]),
            liveRange(() => props.domain[1]),
          ]}
          attrs={attrs}
        >
          {(surface: JXG.Surface3D) => {
            createEffect(
              () => [props.fn, deepArray(props.domain)],
              () => refresh(surface),
            )
            return props.children?.(surface)
          }}
        </Element>
      )
    },
    /** A parametric surface (u, v) ↦ fn(u, v) over the domain. */
    Surface3D: (
      props: {
        fn: (u: number, v: number) => Coords3D
        domain: Domain2D
        children?: (surface: JXG.Surface3D) => JSX.Element
      } & JXG.Surface3DAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'children')
      return (
        <Element
          type="parametricsurface3d"
          view
          parent={[
            (u: number, v: number) => props.fn(u, v),
            liveRange(() => props.domain[0]),
            liveRange(() => props.domain[1]),
          ]}
          attrs={attrs}
        >
          {(surface: JXG.Surface3D) => {
            createEffect(
              () => [props.fn, deepArray(props.domain)],
              () => refresh(surface),
            )
            return props.children?.(surface)
          }}
        </Element>
      )
    },
    Curve3D: (
      props: {
        fn: (t: number) => Coords3D
        domain: Coords
        children?: (curve: JXG.Curve3D) => JSX.Element
      } & JXG.Curve3DAttributes,
    ) => {
      const attrs = omit(props, 'fn', 'domain', 'children')
      return (
        <Element
          type="curve3d"
          view
          parent={[(t: number) => props.fn(t), liveRange(() => props.domain)]}
          attrs={attrs}
        >
          {(curve: JXG.Curve3D) => {
            createEffect(
              () => [props.fn, deepArray(props.domain)],
              () => refresh(curve),
            )
            return props.children?.(curve)
          }}
        </Element>
      )
    },
    /** The line through a point along a direction, limited to a range of multiples of it if given. */
    Line3D: (
      props: {
        point: Coords3D | JXG.Point3D
        direction: Coords3D
        range?: Coords
        children?: (line: JXG.Line3D) => JSX.Element
      } & JXG.Line3DAttributes,
    ) => {
      const attrs = omit(props, 'point', 'direction', 'range', 'children')
      return (
        <Element
          type="line3d"
          view
          parent={[
            point3D(() => props.point),
            // JSXGraph turns the direction it is given into its own homogeneous, normalized one, in place.
            () => [...props.direction],
            // Without a range, JSXGraph would take the direction for a second point.
            [() => props.range?.[0] ?? -Infinity, () => props.range?.[1] ?? Infinity],
          ]}
          attrs={attrs}
        >
          {(line: JXG.Line3D) => {
            createEffect(
              () => [deepArray(props.point), deepArray(props.direction), deepArray(props.range)],
              () => refresh(line),
            )
            return props.children?.(line)
          }}
        </Element>
      )
    },
    /** The plane through a point spanned by two directions, limited to ranges of multiples of them if given. */
    Plane3D: (
      props: {
        point: Coords3D | JXG.Point3D
        directions: [Coords3D, Coords3D]
        range?: Domain2D
        children?: (plane: JXG.Plane3D) => JSX.Element
      } & JXG.Plane3DAttributes,
    ) => {
      const attrs = omit(props, 'point', 'directions', 'range', 'children')
      // JSXGraph checks the ends of the ranges as numbers, so they can't be functions.
      const range = (i: 0 | 1) => liveRange(() => props.range?.[i] ?? [-Infinity, Infinity])
      const plane = () => (
        <Element
          type="plane3d"
          view
          parent={[
            point3D(() => props.point),
            // JSXGraph turns the directions it is given into its own homogeneous, normalized ones, in place.
            () => [...props.directions[0]],
            () => [...props.directions[1]],
            range(0),
            range(1),
          ]}
          attrs={attrs}
        >
          {(plane: JXG.Plane3D) => {
            createEffect(
              () => [deepArray(props.point), deepArray(props.directions), deepArray(props.range)],
              () => refresh(plane as unknown as { board: JXG.Board }),
            )
            return props.children?.(plane)
          }}
        </Element>
      )
      // JSXGraph decides when it creates a plane whether it is infinite, clipped to the view,
      // or a finite surface made of faces, so adding or removing the range recreates it.
      return (
        <Show when={props.range !== undefined} fallback={plane()}>
          {plane()}
        </Show>
      )
    },
    Polygon3D: (
      props: {
        points: Array<Coords3D | JXG.Point3D>
        children?: (polygon: JXG.Polygon3D) => JSX.Element
      } & JXG.Polygon3DAttributes,
    ) => {
      const attrs = omit(props, 'points', 'children')
      return (
        <Element type="polygon3d" view parent={props.points} attrs={attrs}>
          {(polygon: JXG.Polygon3D) => {
            createEffect(
              () => deepArray(props.points),
              (points) => {
                // Points given as elements move on their own; only coordinates are ours to update.
                const vertices = polygon.vertices as unknown as JXG.Point3D[]
                for (let i = 0; i < Math.min(points.length, vertices.length); i++) {
                  const point = points[i]!
                  if (Array.isArray(point)) vertices[i]!.setPosition(point)
                }
                polygon.board.update()
              },
            )
            return props.children?.(polygon)
          }}
        </Element>
      )
    },
    /**
     * Escape hatch for plain JSXGraph code.
     * Elements it creates while it runs are removed when it unmounts; ones created later (e.g. in effects) are not.
     */
    Custom: (props: {
      children: (board: JXG.Board, view: JXG.View3D | null) => JSX.Element | void
    }) => {
      const board = useContext(BoardContext)
      const view = useContext(View3DContext)
      return (
        <Show when={board()}>
          {(board) => {
            const objects = () => board().objects as Record<string, JXG.GeometryElement>
            const before = new Set(Object.keys(objects()))
            const result = props.children(board(), view())
            const created = Object.values(objects()).filter((el) => !before.has(el.id))
            onCleanup(() => {
              for (const el of created.reverse()) {
                // Removing an element also removes the elements built on it.
                if (!(el.id in objects())) continue
                const elView = Reflect.get(el, 'is3D')
                  ? (Reflect.get(el, 'view') as JXG.View3D)
                  : null
                ;(elView ?? board()).removeObject(el)
              }
            })
            return result ?? null
          }}
        </Show>
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

/**
 * A range whose ends are read when JSXGraph reads them.
 * JSXGraph reads some ranges whole and others end by end, so neither a function nor a pair of functions would do.
 */
function liveRange(range: () => Coords): Coords {
  return Object.defineProperties([0, 0], {
    0: { get: () => range()[0] },
    1: { get: () => range()[1] },
  }) as Coords
}

/** A point element as is, or coordinates as functions so that the point follows them. */
function point3D(point: () => Coords3D | JXG.Point3D) {
  const p = point()
  return Array.isArray(p) ? ([0, 1, 2] as const).map((i) => () => (point() as Coords3D)[i]) : p
}

function fieldParents(
  props: { domain: Domain2D; steps?: number },
  fn: (x: number, y: number) => unknown,
) {
  const axis = (i: 0 | 1) => [
    () => props.domain[i][0],
    () => props.steps ?? 10,
    () => props.domain[i][1],
  ]
  return [fn, axis(0), axis(1)]
}

const isElement = (value: unknown) =>
  typeof value === 'object' && value !== null && 'board' in value && 'id' in value

function Element<T extends Pick<JXG.GeometryElement, 'setAttribute' | 'update'>>(props: {
  type: string
  /** Create the element in the enclosing `View3D` rather than on the board. */
  view?: boolean
  /**
   * The element is recreated when a parent element is swapped or a parent changes kind (e.g. a domain is added).
   * Other changes are for each component to apply, typically through functions given as parents.
   */
  parent: unknown[]
  attrs?: Record<string, unknown>
  children?: (el: T) => JSX.Element
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

  const shape = createMemo(
    () => props.parent.map((p) => (isElement(p) ? p : Array.isArray(p) ? 'array' : typeof p)),
    {
      name: 'parent-shape',
      equals: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
    },
  )

  createEffect(
    () => [container(), shape()] as const,
    ([parent]) => {
      if (!parent)
        throw new Error(
          `<${props.type}> must be placed inside a ${props.view ? 'View3D' : 'Board'}`,
        )
      const created = untrack(() =>
        (parent.create as (...args: unknown[]) => T)(props.type, props.parent, attrs()),
      )
      setEl(() => created)
      return () => {
        props.beforeRemove?.(created)
        parent.removeObject(created as unknown as JXG.GeometryElement)
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
