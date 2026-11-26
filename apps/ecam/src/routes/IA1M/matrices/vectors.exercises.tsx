import { Board } from '@learning/components'
import { Exercise, Sequence, tex } from '@learning/core'
import { Simple } from '@learning/exercises/math/Simple'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { Show } from 'solid-js'
import * as v from 'valibot'

type Vector = readonly number[]
type Pair = { x: Vector; y: Vector }
type Name = keyof Pair

const COLORS: Record<Name, string> = { x: '#0369a1', y: '#b45309' }

const column = (v: Vector) => `\\begin{bmatrix} ${v.join(' \\\\ ')} \\end{bmatrix}`

function number(x: number) {
  if (Number.isInteger(x)) return `${x}`
  const denominator = [2, 3, 4, 5, 6, 8, 10].find((d) => Number.isInteger(x * d))
  if (denominator === undefined) return `${x}`
  return `${x < 0 ? '-' : ''}\\frac{${Math.abs(x * denominator)}}{${denominator}}`
}

/** The λ such that y = λx, or undefined if there is none. */
function ratio(x: Vector, y: Vector) {
  const pivot = x.findIndex((xi) => xi !== 0)
  if (pivot === -1) return undefined
  const lambda = y[pivot]! / x[pivot]!
  return x.every((xi, i) => y[i] === lambda * xi) ? lambda : undefined
}

const equal = (a: Vector, b: Vector) => a.length === b.length && a.every((ai, i) => ai === b[i])

// The same on every axis, so that parallel vectors also look parallel.
const extent = ({ x, y }: Pair) => Math.max(3, ...[...x, ...y].map(Math.abs)) + 1

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

function DependentOrIndependent(props: Pair) {
  const lambda = () => ratio(props.x, props.y)
  return (
    <MultipleChoice
      prompt={
        <>
          <p>Are the vectors</p>
          <div class="flex justify-center">
            {tex`\mathbf{x}=${column(props.x)},\qquad\mathbf{y}=${column(props.y)}`}
          </div>
          <p>linearly dependent or linearly independent?</p>
        </>
      }
      choices={{ dependent: 'Linearly dependent', independent: 'Linearly independent' }}
      answer={lambda() === undefined ? 'independent' : 'dependent'}
      feedback={(ctx) => (
        <Show
          when={lambda() !== undefined}
          fallback={
            <Show when={!ctx.correct}>
              <p>
                The ratios of the components are not all equal, so {tex`\mathbf{y}`} is not a
                multiple of {tex`\mathbf{x}`}: the vectors are linearly independent.
              </p>
            </Show>
          }
        >
          <Show when={ctx.correct} fallback={<Parallel x={props.x} y={props.y} />}>
            <Multiple x={props.x} y={props.y} lambda={lambda()!} />
          </Show>
        </Show>
      )}
    />
  )
}

/**
 * For dependent vectors. The first time the student answers "not parallel", they draw the vectors
 * and are asked again; answering it a second time shows why they are parallel, so the
 * exercise always ends.
 */
function Parallel(props: Pair & { afterDrawing?: boolean }) {
  return (
    <MultipleChoice
      prompt={
        <p>
          {props.afterDrawing ? 'Look at your drawing: are ' : 'Are '}
          {tex`\mathbf{x}`} and {tex`\mathbf{y}`} parallel?
        </p>
      }
      choices={{ parallel: 'Parallel', notParallel: 'Not parallel' }}
      answer="parallel"
      // Drawing allows resubmissions, which this question would otherwise inherit.
      options={{ allowResubmissions: false }}
      feedback={(ctx) => (
        <Show when={ctx.correct || props.afterDrawing} fallback={<Draw x={props.x} y={props.y} />}>
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
          <Multiple x={props.x} y={props.y} lambda={ratio(props.x, props.y)!} />
        </Show>
      )}
    />
  )
}

function Multiple(props: Pair & { lambda: number }) {
  return (
    <Simple
      prompt={
        <p>
          Write one vector as a multiple of the other: find {tex`\alpha`} such that{' '}
          {tex`\mathbf{y}=\alpha\mathbf{x}`}.
        </p>
      }
      label="\alpha ="
      options={{ allowResubmissions: false }}
      grade={(attempt) => attempt.isEqual(props.lambda)}
      feedback={(ctx) => (
        <Show when={!ctx.correct}>
          <p>
            Comparing the components gives {tex`\alpha=${number(props.lambda)}`}, and indeed{' '}
            {tex`${column(props.y)}=${number(props.lambda)}${column(props.x)}`}.
          </p>
        </Show>
      )}
    />
  )
}

/** The student places x and y, and may retry until both are right. */
function Draw(props: Pair) {
  const unit = (i: number) => props.x.map((_, j) => (i === j ? 1 : 0))
  return (
    <Exercise
      schema={{ data: {}, inputs: { x: v.array(v.number()), y: v.array(v.number()) } }}
      data={{}}
      options={{ allowResubmissions: true }}
      initialState={() => ({ x: unit(0), y: unit(1) })}
      prompt={(ctx) => {
        const placing = {
          target: { x: props.x, y: props.y },
          get drawn(): Pair {
            return { x: ctx.state.current.x ?? unit(0), y: ctx.state.current.y ?? unit(1) }
          },
          get locked() {
            return ctx.state.correct === true
          },
          onChange: (name: Name, value: number[]) => ctx.state.set(name, value),
        }
        return (
          <>
            <p>
              Draw {tex`\mathbf{x}`} and {tex`\mathbf{y}`}:{' '}
              {props.x.length === 2
                ? 'drag the heads of the arrows to the right points.'
                : 'move the sliders until the arrows are at the right places.'}
            </p>
            <Show when={props.x.length === 2} fallback={<Draw3D {...placing} />}>
              <Draw2D {...placing} />
            </Show>
          </>
        )
      }}
      grade={(ctx) => equal(ctx.inputs.x, props.x) && equal(ctx.inputs.y, props.y)}
      feedback={(ctx) => (
        <Show
          when={ctx.correct}
          fallback={<p>Not quite: compare the coordinates of your arrows with the vectors.</p>}
        >
          <Parallel x={props.x} y={props.y} afterDrawing />
        </Show>
      )}
    />
  )
}

type Placing = {
  target: Pair
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
