import { Board } from '@learning/components'
import { createDerivedStep, createStep, Sequence, tex, type Vector } from '@learning/core'
import { Simple } from '@learning/exercises/math/Simple'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { dynamic } from '@solidjs/web'
import { Show } from 'solid-js'
import * as v from 'valibot'

type Pair = { x: number[]; y: number[] }
type Name = keyof Pair

const COLORS = { x: '#0369a1', y: '#b45309' }

// The same on every axis, so that parallel vectors also look parallel.
const extent = ({ x, y }: { x: Vector; y: Vector }) =>
  Math.max(3, ...[...x.N(), ...y.N()].map(Math.abs)) + 1

/** Asks, for each pair of vectors, whether they are linearly dependent. */
export function Dependence(props: { id: string; pairs: Pair[] }) {
  return (
    <Sequence id={props.id}>
      {props.pairs.map((pair) => (
        <DependentOrIndependent x={pair.x} y={pair.y} />
      ))}
    </Sequence>
  )
}

const pair = { x: 'vector', y: 'vector' } as const

export const DependentOrIndependent = createDerivedStep(
  MultipleChoice,
  pair,
  (data) => ({
    prompt: (
      <>
        <p>Are the vectors</p>
        <div class="flex justify-center">
          {tex`\mathbf{x}=${data.x},\qquad\mathbf{y}=${data.y}`}
        </div>
        <p>linearly dependent or linearly independent?</p>
      </>
    ),
    choices: { dependent: 'Linearly dependent', independent: 'Linearly independent' },
    answer: data.x.isParallel(data.y) ? 'dependent' : 'independent',
  }),
  {
    name: 'IA1M/vectors/dependence',
    feedback: (ctx) => (
      <Show
        when={ctx.data.x.isParallel(ctx.data.y)}
        fallback={
          <Show when={!ctx.correct}>
            <p>
              The ratios of the components are not all equal, so {tex`\mathbf{y}`} is not a multiple
              of {tex`\mathbf{x}`}: the vectors are linearly independent.
            </p>
          </Show>
        }
      >
        <Show when={ctx.correct} fallback={<Parallel x={ctx.data.x} y={ctx.data.y} />}>
          <Multiple x={ctx.data.x} y={ctx.data.y} />
        </Show>
      </Show>
    ),
  },
)

/**
 * For dependent vectors. The first time the student answers "not parallel", they draw the vectors
 * and are asked again; answering it a second time shows why they are parallel, so the
 * exercise always ends.
 */
export const Parallel = createDerivedStep(
  MultipleChoice,
  { ...pair, afterDrawing: v.optional(v.boolean(), false) },
  (data) => ({
    prompt: (
      <p>
        {data.afterDrawing ? 'Look at your drawing: are ' : 'Are '}
        {tex`\mathbf{x}`} and {tex`\mathbf{y}`} parallel?
      </p>
    ),
    choices: { parallel: 'Parallel', notParallel: 'Not parallel' },
    answer: 'parallel',
  }),
  {
    name: 'IA1M/vectors/parallel',
    // Drawing allows resubmissions, which this question would otherwise inherit.
    options: { allowResubmissions: false },
    feedback: (ctx) => (
      <Show
        when={ctx.correct || ctx.data.afterDrawing}
        fallback={<Draw x={ctx.data.x} y={ctx.data.y} />}
      >
        <Show when={!ctx.correct}>
          <p>
            Both arrows lie on the same line through the origin, so {tex`\mathbf{x}`} and{' '}
            {tex`\mathbf{y}`} are parallel.
          </p>
        </Show>
        <p>
          Remember that two parallel vectors are always linearly dependent: one of them is a
          multiple of the other.
        </p>
        <Multiple x={ctx.data.x} y={ctx.data.y} />
      </Show>
    ),
  },
)

// y = αx, unless x is zero: then no α may exist, and x = αy is asked instead.
const sides = (x: Vector) => (x.isZero() ? (['x', 'y'] as const) : (['y', 'x'] as const))

/** For dependent vectors: the α such that y = αx, or x = αy when x is zero. */
export const Multiple = createDerivedStep(
  Simple,
  pair,
  (data) => {
    const [left, right] = sides(data.x)
    const alpha = data[right].ratio(data[left])
    return {
      prompt: (
        <>
          <p>For the vectors</p>
          <div class="flex justify-center">
            {tex`\mathbf{x}=${data.x},\qquad\mathbf{y}=${data.y}`}
          </div>
          <p>
            write one vector as a multiple of the other: find {tex`\alpha`} such that{' '}
            {tex`\mathbf{${left}}=\alpha\mathbf{${right}}`}.
          </p>
        </>
      ),
      label: '\\alpha =',
      // When both vectors are zero, every α is right.
      grade: (attempt) => alpha === undefined || attempt.isEqual(alpha),
    }
  },
  {
    name: 'IA1M/vectors/multiple',
    options: { allowResubmissions: false },
    feedback: (ctx) => {
      const left = () => ctx.data[sides(ctx.data.x)[0]]
      const right = () => ctx.data[sides(ctx.data.x)[1]]
      return (
        <Show when={!ctx.correct}>
          <p>
            Comparing the components gives {tex`\alpha=${right().ratio(left())}`}, and indeed{' '}
            {tex`${left()}=${right().ratio(left())}${right()}`}.
          </p>
        </Show>
      )
    },
  },
)

const unit = (dimension: number, i: number) =>
  Array.from({ length: dimension }, (_, j) => (i === j ? 1 : 0))

/** The student places x and y, and may retry until both are right. */
export const Draw = createStep({
  name: 'IA1M/vectors/draw',
  schema: { data: pair, inputs: { x: v.array(v.number()), y: v.array(v.number()) } },
  options: { allowResubmissions: true },
  initialState: (data) => {
    const n = data.x.dimension
    return { x: unit(n, 0), y: unit(n, 1) }
  },
  prompt: (ctx) => {
    const Drawing = dynamic(() => (ctx.data.x.dimension === 2 ? Draw2D : Draw3D))
    return (
      <>
        <p>
          Draw {tex`\mathbf{x}`} and {tex`\mathbf{y}`}:{' '}
          {ctx.data.x.dimension === 2
            ? 'drag the heads of the arrows to the right points.'
            : 'move the sliders until the arrows are at the right places.'}
        </p>
        <Drawing
          target={ctx.data}
          drawn={{
            x: ctx.state.current.x ?? unit(ctx.data.x.dimension, 0),
            y: ctx.state.current.y ?? unit(ctx.data.x.dimension, 1),
          }}
          locked={ctx.state.correct === true}
          onChange={(name, value) => ctx.state.set(name, value)}
        />
      </>
    )
  },
  grade: (ctx) => [ctx.data.x.isEqual(ctx.inputs.x), ctx.data.y.isEqual(ctx.inputs.y)],
  feedback: (ctx) => (
    <Show
      when={ctx.correct}
      fallback={<p>Not quite: compare the coordinates of your arrows with the vectors.</p>}
    >
      <Parallel x={ctx.data.x} y={ctx.data.y} afterDrawing />
    </Show>
  ),
})

type Placing = {
  target: { x: Vector; y: Vector }
  drawn: Pair
  locked: boolean
  onChange: (name: Name, value: number[]) => void
}

function Draw2D(props: Placing) {
  const size = () => extent(props.target) + 0.5
  const arrow = (name: Name) => {
    const head = () => props.drawn[name] as [number, number]
    return (
      <>
        <Board.Arrow from={[0, 0]} to={head()} color={COLORS[name]} strokeWidth={3} fixed />
        <Board.Point
          position={head()}
          name={`\\mathbf{${name}}`}
          color={COLORS[name]}
          snapToGrid
          fixed={props.locked}
          onDrag={(point) => props.onChange(name, [point.X(), point.Y()])}
        />
      </>
    )
  }
  return (
    <Board axis grid boundingBox={[-size(), size(), size(), -size()]} class="h-96 w-96">
      {arrow('x')}
      {arrow('y')}
    </Board>
  )
}

function Draw3D(props: Placing) {
  const size = () => extent(props.target)
  const arrow = (name: Name) => {
    const head = () => props.drawn[name] as [number, number, number]
    return (
      <>
        <Board.Vector3D from={[0, 0, 0]} to={head()} strokeColor={COLORS[name]} strokeWidth={3} />
        <Board.Point3D
          position={head()}
          name={`\\mathbf{${name}}`}
          size={0}
          fixed
          label={{ strokeColor: COLORS[name] }}
        />
      </>
    )
  }
  const sliders = (name: Name) => (
    <fieldset class="flex flex-col gap-1">
      <legend style={{ color: COLORS[name] }}>{tex`\mathbf{${name}}`}</legend>
      {[1, 2, 3].map((component, i) => (
        <label class="flex items-center gap-2">
          <span class="w-6">{tex`${name}_${component}`}</span>
          <input
            type="range"
            min={-size()}
            max={size()}
            step={1}
            value={props.drawn[name][i]}
            disabled={props.locked}
            onInput={(event) =>
              props.onChange(
                name,
                props.drawn[name].map((c, j) => (i === j ? event.currentTarget.valueAsNumber : c)),
              )
            }
          />
          <output class="w-6 text-right" textContent={String(props.drawn[name][i])} />
        </label>
      ))}
    </fieldset>
  )
  return (
    <div class="flex flex-wrap items-center justify-center gap-8">
      <Board boundingBox={[-8, 8, 8, -8]} class="h-96 w-96">
        <Board.View3D
          position={[-6, -3]}
          size={[12, 10]}
          bounds={[
            [-size(), size()],
            [-size(), size()],
            [-size(), size()],
          ]}
          depthOrder={{ enabled: true }}
          az={{ slider: { start: 1 } }}
          el={{ slider: { start: 0.3 } }}
          xAxis={{ name: '1' }}
          yAxis={{ name: '2' }}
          zAxis={{ name: '3' }}
          xPlaneRear={{ fillOpacity: 0.1 }}
          yPlaneRear={{ fillOpacity: 0.1 }}
          zPlaneRear={{ fillOpacity: 0.1 }}
        >
          {arrow('x')}
          {arrow('y')}
        </Board.View3D>
      </Board>
      <div class="flex gap-6">
        {sliders('x')}
        {sliders('y')}
      </div>
    </div>
  )
}
