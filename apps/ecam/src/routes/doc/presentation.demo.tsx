import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
import { Board, Deck, Fa, Latex, MathField } from '@learning/components'
import { expr, tex } from '@learning/core'
import { Factor } from '@learning/exercises/math/algebra/Factor'
import { Integrate } from '@learning/exercises/math/calculus/Integrate'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { PythonCode } from '@learning/exercises/python/Code'
import type { JSX } from '@solidjs/web'
import { createEffect, createMemo, createSignal, For, Loading, untrack } from 'solid-js'
import { bank } from './random-questions.demo'
import { Limit } from './remediation.demo'

const accent = '#eb811b'
const dark = '#23373b'
const muted = '#94a3b8'

const decimal = (x: number, digits = 4) => x.toFixed(digits).replace('.', ',')

/** Exercises grow as students answer: they scroll inside the slide rather than overflow it. */
function Panel(props: { children: JSX.Element }) {
  return (
    <div class="max-h-170 overflow-y-auto rounded-lg bg-white p-8 shadow-inner">
      {props.children}
    </div>
  )
}

export const FactorLive = () => (
  <Panel>
    <Factor id="presentation-factor" expr="x^2 - 5x + 6" />
  </Panel>
)

export const LimitLive = () => (
  <Panel>
    <Limit id="presentation-limit" numerator="x^2 - 4" denominator="x - 2" a="2" limit="4" />
  </Panel>
)

export const IntegrateLive = () => (
  <Panel>
    <Integrate id="presentation-integrate" expr="3x^2 + 2x" low="0" high="2" />
  </Panel>
)

export const ChoiceLive = () => (
  <Panel>
    <MultipleChoice
      id="presentation-choice"
      prompt={<p>Quelle fonction est égale à sa dérivée ?</p>}
      choices={{ A: tex`x^2`, B: tex`e^x`, C: tex`\ln x`, D: tex`\sin x` }}
      answer="B"
      shuffle
    />
  </Panel>
)

export const BankLive = () => (
  <Panel>
    <bank.Practice id="presentation-bank" />
  </Panel>
)

export const PythonLive = () => (
  <Panel>
    <PythonCode
      id="presentation-python"
      prompt={
        <p>
          Définissez une fonction <code>somme(n)</code> qui renvoie la somme des entiers de 1 à n.
        </p>
      }
      initialCode={'def somme(n):\n    total = 0\n    return total\n'}
      tests={(expect) => ({
        'somme(1) vaut 1': expect.with('somme(1)').toReturn(1),
        'somme(4) vaut 10': expect.with('somme(4)').toReturn(10),
        'somme(100) vaut 5050': expect.with('somme(100)').toReturn(5050),
        "Le code n'utilise pas sum": expect.code.not.toMatch(/sum\(/),
      })}
    />
  </Panel>
)

export const PythonPlotLive = () => (
  <Panel>
    <PythonCode
      id="presentation-python-plot"
      math
      prompt={<p>Tracez le graphe de la fonction sinus sur [-3, 3], et nommez les axes.</p>}
      initialCode={
        'import numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.linspace(-3, 3, 100)\nplt.plot(x, np.cos(x))\n'
      }
      tests={(expect) => ({
        'La courbe est tracée': expect.matplotlib.plot('np.sin(x)', -3, 3),
        "L'axe x est nommé": expect.matplotlib.xLabel().toMatch(/x/),
        "L'axe y est nommé": expect.matplotlib.yLabel().toMatch(/y/),
      })}
    />
  </Panel>
)

type PathStep = { text: JSX.Element; correct?: boolean; children?: PathStep[] }

const limitPath: PathStep[] = [
  {
    text: 'Calculer la limite',
    correct: false,
    children: [
      {
        text: <>Factoriser le numérateur {tex`x^2 - 4`}</>,
        correct: false,
        children: [
          { text: 'Trouver une racine du numérateur', correct: true },
          {
            text: 'Trouver le facteur associé à cette racine',
            correct: false,
            children: [
              {
                text: 'Une explication calculée à partir de la réponse, puis un nouvel essai',
                correct: true,
              },
            ],
          },
          { text: 'Factoriser à nouveau le numérateur', correct: true },
        ],
      },
      { text: 'Calculer à nouveau la limite', correct: true },
    ],
  },
]

function PathList(props: { steps: PathStep[] }) {
  return (
    <ul class="list-none! space-y-2 border-l-2 border-slate-300 pl-6!">
      <For each={props.steps}>
        {(step) => (
          <>
            <Deck.Fragment as="li">
              <span
                class={[
                  'mr-4 inline-block w-12 rounded text-center',
                  step.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                ]}
              >
                {step.correct ? '✓' : '✗'}
              </span>
              {step.text}
            </Deck.Fragment>
            {step.children && (
              <li class="list-none">
                <PathList steps={step.children} />
              </li>
            )}
          </>
        )}
      </For>
    </ul>
  )
}

/** The path of a conversation with the limit exercise, one answer at a time. */
export const LimitPath = () => (
  <div class="text-[44px] [&_ul]:my-2">
    <PathList steps={limitPath} />
  </div>
)

/** Answers `null` rather than throwing while the formula being typed is incomplete. */
async function attempt<T>(compute: () => T | Promise<T>): Promise<T | null> {
  try {
    return await compute()
  } catch {
    return null
  }
}

export function Playground() {
  const [f, setF] = createSignal('(x-2)(x-3)', { name: 'playground-f' })
  const [g, setG] = createSignal('x^2-5x+6', { name: 'playground-g' })
  const results = createMemo(
    async () => {
      const [source, other] = [f(), g()]
      const [expanded, factored, derivative, equal] = await Promise.all([
        attempt(() => expr(source).expand().latex()),
        attempt(() => expr(source).factor().latex()),
        attempt(() => expr(source).diff().latex()),
        attempt(() => expr(source).isEqual(expr(other))),
      ])
      return { expanded, factored, derivative, equal }
    },
    { name: 'playground-results' },
  )
  const Row = (props: { label: string; value: string | null }) => (
    <tr class="border-b border-slate-200">
      <td class="py-2 pr-6 text-slate-500">{props.label}</td>
      <td class="py-2">{props.value === null ? '…' : <Latex value={props.value} />}</td>
    </tr>
  )
  return (
    <div class="grid grid-cols-2 gap-12 text-[44px]">
      <div class="space-y-6">
        <label class="block">
          <span class="text-slate-500">Une expression {tex`f`}</span>
          <MathField
            class="mt-2 block w-full rounded border border-slate-300 px-3 text-[48px]"
            value={f()}
            onInput={(e) => setF(e.currentTarget.value)}
          />
        </label>
        <label class="block">
          <span class="text-slate-500">Une autre expression {tex`g`}</span>
          <MathField
            class="mt-2 block w-full rounded border border-slate-300 px-3 text-[48px]"
            value={g()}
            onInput={(e) => setG(e.currentTarget.value)}
          />
        </label>
      </div>
      <Loading fallback={<p>Calcul…</p>}>
        <table class="w-full">
          <tbody>
            <Row label="Développée" value={results().expanded} />
            <Row label="Factorisée" value={results().factored} />
            <Row label="Dérivée" value={results().derivative} />
            <tr>
              <td class="py-2 pr-6 text-slate-500">{tex`f = g`} ?</td>
              <td
                class={[
                  'py-2 font-normal',
                  results().equal === null
                    ? 'text-slate-500'
                    : results().equal
                      ? 'text-green-700'
                      : 'text-red-700',
                ]}
              >
                {results().equal === null ? '…' : results().equal ? 'Oui' : 'Non'}
              </td>
            </tr>
          </tbody>
        </table>
      </Loading>
    </div>
  )
}

function Controls(props: { children: JSX.Element }) {
  return (
    <div class="flex flex-wrap items-center justify-center gap-6 text-[36px]">{props.children}</div>
  )
}

function PlayButton(props: { playing: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class="flex cursor-pointer items-center gap-2 rounded bg-(--m-accent) px-4 py-1 text-white"
      onClick={() => props.onClick()}
    >
      <Fa icon={props.playing ? faPause : faPlay} />
      {props.playing ? 'Pause' : 'Animer'}
    </button>
  )
}

function Choice<T extends string>(props: {
  options: Record<T, string>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div class="flex overflow-hidden rounded border border-slate-300">
      <For each={Object.entries(props.options) as [T, string][]}>
        {([value, label]) => (
          <button
            type="button"
            class={[
              'cursor-pointer px-3 py-1',
              props.value === value ? 'bg-(--m-dark) text-white' : 'bg-white hover:bg-slate-100',
            ]}
            onClick={() => props.onChange(value)}
          >
            {label}
          </button>
        )}
      </For>
    </div>
  )
}

const riemannF = (x: number) => 1.5 + Math.sin(x)
// ∫₀⁶ (1.5 + sin x) dx = 9 + 1 − cos 6
const riemannExact = 10 - Math.cos(6)
const riemannTypes = {
  left: 'Gauche',
  right: 'Droite',
  middle: 'Milieu',
  trapezoidal: 'Trapèzes',
} as const
type RiemannType = keyof typeof riemannTypes

function riemannSum(n: number, type: RiemannType) {
  const h = 6 / n
  let sum = 0
  for (let i = 0; i < n; i++) {
    const x = i * h
    sum +=
      type === 'left'
        ? riemannF(x)
        : type === 'right'
          ? riemannF(x + h)
          : type === 'middle'
            ? riemannF(x + h / 2)
            : (riemannF(x) + riemannF(x + h)) / 2
  }
  return sum * h
}

export function Riemann() {
  const max = 40
  const [n, setN] = createSignal(1, { name: 'riemann-n' })
  const [type, setType] = createSignal<RiemannType>('left', { name: 'riemann-type' })
  const [playing, setPlaying] = createSignal(true, { name: 'riemann-playing' })
  let elapsed = 0
  const step = (dt: number) => {
    elapsed += dt
    if (elapsed < (n() >= max ? 2 : 0.25)) return
    elapsed = 0
    setN(n() >= max ? 1 : n() + 1)
  }
  const sum = createMemo(() => riemannSum(n(), type()), { name: 'riemann-sum' })
  return (
    <div>
      <Board
        axis
        boundingBox={[-0.5, 3, 6.5, -0.5]}
        class="h-130 w-265"
        onFrame={playing() ? step : undefined}
      >
        <Board.RiemannSum
          f={riemannF}
          n={n()}
          type={type()}
          domain={[0, 6]}
          fillColor={accent}
          fillOpacity={0.35}
          strokeColor={accent}
        />
        <Board.Plot fn={riemannF} strokeColor={dark} strokeWidth={3} />
      </Board>
      <Controls>
        <PlayButton playing={playing()} onClick={() => setPlaying(!playing())} />
        <input
          type="range"
          min={1}
          max={max}
          value={n()}
          class="w-64 accent-(--m-accent)"
          onInput={(e) => {
            setPlaying(false)
            setN(Number(e.currentTarget.value))
          }}
        />
        <Choice options={riemannTypes} value={type()} onChange={setType} />
      </Controls>
      <p class="mt-3 text-center text-[38px]">
        {n()} rectangles : somme ≈ {decimal(sum())}, intégrale ≈ {decimal(riemannExact)}, erreur ≈{' '}
        {decimal(Math.abs(sum() - riemannExact))}
      </p>
    </div>
  )
}

const cubic = (x: number) => x ** 3 / 4 - x
const cubicSlope = (x: number) => (3 * x ** 2) / 4 - 1

export function TangentTrace() {
  const [start, end] = [-2.8, 2.8]
  const [a, setA] = createSignal(start, { name: 'tangent-a' })
  const [playing, setPlaying] = createSignal(true, { name: 'tangent-playing' })
  let hold = 0
  const step = (dt: number) => {
    if (a() < end) return setA(Math.min(a() + dt * 0.9, end))
    hold += dt
    if (hold > 1.5) {
      hold = 0
      setA(start)
    }
  }
  return (
    <div>
      <Board
        axis
        boundingBox={[-3.5, 6.5, 3.5, -4]}
        class="h-160 w-160"
        onFrame={playing() ? step : undefined}
      >
        <Board.Plot fn={cubic} strokeColor={dark} strokeWidth={3}>
          {(curve) => (
            <Board.Glider
              on={curve}
              position={[a(), cubic(a())]}
              name="A"
              size={5}
              color={accent}
              onDrag={(P) => {
                setPlaying(false)
                setA(P.X())
              }}
            >
              {(A) => <Board.Tangent at={A} strokeColor={accent} strokeWidth={2} />}
            </Board.Glider>
          )}
        </Board.Plot>
        <Board.Plot fn={cubicSlope} domain={[start, a()]} strokeColor="#c0392b" strokeWidth={3} />
        <Board.Segment
          from={[a(), cubic(a())]}
          to={[a(), cubicSlope(a())]}
          fixed
          dash={2}
          strokeColor={muted}
        />
        <Board.Point
          position={[a(), cubicSlope(a())]}
          fixed
          name="f'(a)"
          color="#c0392b"
          size={3}
        />
      </Board>
      <Controls>
        <PlayButton playing={playing()} onClick={() => setPlaying(!playing())} />
        <span>pente de la tangente : {decimal(cubicSlope(a()), 2)}</span>
      </Controls>
    </div>
  )
}

const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1))

/** The Taylor polynomial of sin at 0, of degree n. */
function sinTaylor(n: number) {
  const terms: [number, number][] = []
  for (let k = 1; k <= n; k += 2) terms.push([k, (-1) ** ((k - 1) / 2) / factorial(k)])
  return {
    fn: (x: number) => terms.reduce((sum, [k, c]) => sum + c * x ** k, 0),
    latex: terms
      .map(([k], i) => {
        const term = k === 1 ? 'x' : `\\frac{x^{${k}}}{${k}!}`
        return i === 0 ? term : `${i % 2 === 1 ? '-' : '+'} ${term}`
      })
      .join(' '),
  }
}

export function Taylor() {
  const max = 15
  const [n, setN] = createSignal(1, { name: 'taylor-degree' })
  const [playing, setPlaying] = createSignal(true, { name: 'taylor-playing' })
  const polynomial = createMemo(() => sinTaylor(n()), { name: 'taylor-polynomial' })
  let elapsed = 0
  const step = (dt: number) => {
    elapsed += dt
    if (elapsed < (n() >= max ? 2.5 : 1.2)) return
    elapsed = 0
    setN(n() >= max ? 1 : n() + 2)
  }
  return (
    <div>
      <Board
        axis
        boundingBox={[-10, 2.5, 10, -2.5]}
        class="h-110 w-350"
        onFrame={playing() ? step : undefined}
      >
        <Board.Plot fn={Math.sin} strokeColor={muted} strokeWidth={6} />
        <Board.Plot fn={polynomial().fn} strokeColor={accent} strokeWidth={3} />
      </Board>
      <Controls>
        <PlayButton playing={playing()} onClick={() => setPlaying(!playing())} />
        <input
          type="range"
          min={1}
          max={max}
          step={2}
          value={n()}
          class="w-64 accent-(--m-accent)"
          onInput={(e) => {
            setPlaying(false)
            setN(Number(e.currentTarget.value))
          }}
        />
        <span>degré {n()}</span>
      </Controls>
      <Latex
        class="mt-2 text-center"
        displayMode
        value={`\\sin x \\approx ${polynomial().latex}`}
      />
    </div>
  )
}

export function Fourier() {
  const max = 12
  const [terms, setTerms] = createSignal(3, { name: 'fourier-terms' })
  const [playing, setPlaying] = createSignal(true, { name: 'fourier-playing' })
  const [cx, x0, amplitude] = [-3, 0.5, 1.2]
  const radii = Array.from({ length: max }, (_, k) => (amplitude * 4) / (Math.PI * (2 * k + 1)))
  // Read by JSXGraph at every redraw: plain values rather than signals.
  let theta = 0
  let shown = untrack(terms)
  let history: [number, number][] = []
  const centers: [number, number][] = Array.from({ length: max + 1 }, () => [cx, 0])
  const place = () => {
    for (let k = 0; k < max; k++) {
      const [x, y] = centers[k]!
      const r = k < shown ? radii[k]! : 0
      centers[k + 1] = [
        x + r * Math.cos((2 * k + 1) * theta),
        y + r * Math.sin((2 * k + 1) * theta),
      ]
    }
  }
  place()
  const tip = () => centers[max]!
  const step = (dt: number, board: JXG.Board) => {
    theta += dt * 1.3
    place()
    history.push([theta, tip()[1]])
    history = history.filter(([t]) => theta - t < 11 - x0)
    board.update()
  }
  const formula = createMemo(
    () => {
      const shown = Array.from({ length: Math.min(terms(), 4) }, (_, k) =>
        k === 0 ? '\\sin \\theta' : `\\frac{\\sin ${2 * k + 1}\\theta}{${2 * k + 1}}`,
      )
      return `\\frac{4}{\\pi}\\left(${shown.join(' + ')}${terms() > 4 ? ' + \\cdots' : ''}\\right)`
    },
    { name: 'fourier-formula' },
  )
  return (
    <div>
      <Board
        boundingBox={[-5.5, 3, 11, -3]}
        class="h-120 w-330"
        onFrame={playing() ? step : undefined}
      >
        <Board.Custom>
          {(board) => {
            const points = centers.map((_, k) =>
              board.create('point', [() => centers[k]![0], () => centers[k]![1]], {
                visible: false,
                withLabel: false,
              }),
            )
            const circles = radii.map((r, k) =>
              board.create('circle', [points[k]!, () => (k < shown ? r : 0)], {
                strokeColor: muted,
                strokeWidth: 1.5,
                fillOpacity: 0,
                fixed: true,
                highlight: false,
              }),
            )
            const arms = radii.map((_, k) =>
              board.create('segment', [points[k]!, points[k + 1]!], {
                strokeColor: dark,
                strokeWidth: 2,
                fixed: true,
                highlight: false,
              }),
            )
            board.create(
              'segment',
              [
                [x0, 0],
                [11, 0],
              ],
              {
                strokeColor: muted,
                strokeWidth: 1,
                fixed: true,
                highlight: false,
              },
            )
            board.create(
              'functiongraph',
              [(x: number) => amplitude * Math.sign(Math.sin(theta - (x - x0))), x0, 11],
              { strokeColor: muted, dash: 2, strokeWidth: 1.5, highlight: false },
            )
            const level = board.create('point', [x0, () => tip()[1]], {
              visible: false,
              withLabel: false,
            })
            board.create('segment', [points[max]!, level], {
              strokeColor: accent,
              dash: 2,
              fixed: true,
              highlight: false,
            })
            const wave = board.create('curve', [[], []], {
              strokeColor: accent,
              strokeWidth: 3,
              highlight: false,
            })
            wave.updateDataArray = function () {
              this.dataX = history.map(([t]) => x0 + theta - t)
              this.dataY = history.map(([, y]) => y)
            }
            board.create('point', [() => tip()[0], () => tip()[1]], {
              color: accent,
              size: 4,
              withLabel: false,
              fixed: true,
            })
            createEffect(terms, (n) => {
              shown = n
              circles.forEach((c, k) => c.setAttribute({ visible: k < n }))
              arms.forEach((s, k) => s.setAttribute({ visible: k < n }))
              history = []
              place()
              board.update()
            })
          }}
        </Board.Custom>
      </Board>
      <Controls>
        <PlayButton playing={playing()} onClick={() => setPlaying(!playing())} />
        <input
          type="range"
          min={1}
          max={max}
          value={terms()}
          class="w-64 accent-(--m-accent)"
          onInput={(e) => setTerms(Number(e.currentTarget.value))}
        />
        <span>{terms()} cercles</span>
      </Controls>
      <Latex class="mt-2 text-center" displayMode value={formula()} />
    </div>
  )
}

const slope = (x: number, y: number) => Math.sin(x) - y / 2

/** The solution of y' = slope(x, y) through (x0, y0), by the Runge-Kutta method of order 4. */
function solve(x0: number, y0: number) {
  const h = 0.02
  const xs: number[] = []
  const ys: number[] = []
  for (const direction of [-1, 1]) {
    let [x, y] = [x0, y0]
    const step = direction * h
    const branch: [number, number][] = []
    while (Math.abs(x) <= 7 && Math.abs(y) < 50) {
      branch.push([x, y])
      const k1 = slope(x, y)
      const k2 = slope(x + step / 2, y + (step / 2) * k1)
      const k3 = slope(x + step / 2, y + (step / 2) * k2)
      const k4 = slope(x + step, y + step * k3)
      y += (step / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
      x += step
    }
    if (direction === -1) branch.reverse().pop()
    for (const [x, y] of branch) {
      xs.push(x)
      ys.push(y)
    }
  }
  return (x: number) => {
    if (x < xs[0]! || x > xs.at(-1)!) return NaN
    const i = Math.min(Math.floor((x - xs[0]!) / h), xs.length - 2)
    const t = (x - xs[i]!) / h
    return ys[i]! + t * (ys[i + 1]! - ys[i]!)
  }
}

export function SlopeField() {
  const [start, setStart] = createSignal<[number, number]>([-5, 3], { name: 'ode-start' })
  const [kept, setKept] = createSignal<((x: number) => number)[]>([], { name: 'ode-kept' })
  const solution = createMemo(() => solve(...start()), { name: 'ode-solution' })
  return (
    <div>
      <Board axis boundingBox={[-6.5, 4, 6.5, -4]} class="h-150 w-244">
        <Board.SlopeField
          fn={slope}
          domain={[
            [-6, 6],
            [-3.5, 3.5],
          ]}
          steps={24}
          strokeColor={muted}
        />
        <For each={kept()}>
          {(fn) => <Board.Plot fn={fn} strokeColor={dark} strokeWidth={2} strokeOpacity={0.5} />}
        </For>
        <Board.Plot fn={solution()} strokeColor={accent} strokeWidth={3} />
        <Board.Point
          position={start()}
          name="(x_0, y_0)"
          color={accent}
          size={5}
          onDrag={(P) => setStart([P.X(), P.Y()])}
        />
      </Board>
      <Controls>
        <button
          type="button"
          class="cursor-pointer rounded bg-(--m-dark) px-4 py-1 text-white"
          onClick={() => setKept([...kept(), solution()])}
        >
          Garder cette solution
        </button>
        <button
          type="button"
          class="cursor-pointer rounded border border-slate-300 bg-white px-4 py-1"
          onClick={() => setKept([])}
        >
          Effacer
        </button>
      </Controls>
    </div>
  )
}

export function Wave() {
  const [t, setT] = createSignal(0, { name: 'wave-time' })
  const [playing, setPlaying] = createSignal(true, { name: 'wave-playing' })
  const surface = createMemo(
    () => {
      const s = t()
      return (x: number, y: number) => {
        const r = Math.hypot(x, y)
        return 1.6 * Math.cos(1.6 * r - s) * Math.exp(-r / 4)
      }
    },
    { name: 'wave-surface' },
  )
  return (
    <div>
      <Board
        boundingBox={[-8, 8, 8, -8]}
        class="h-170 w-170"
        onFrame={playing() ? (dt) => setT(t() + dt * 2) : undefined}
      >
        <Board.View3D
          position={[-6, -6]}
          size={[12, 12]}
          bounds={[
            [-5, 5],
            [-5, 5],
            [-2, 2],
          ]}
        >
          <Board.Plot3D
            fn={surface()}
            domain={[
              [-5, 5],
              [-5, 5],
            ]}
            stepsU={36}
            stepsV={36}
            strokeColor={accent}
            strokeWidth={1}
          />
        </Board.View3D>
      </Board>
      <Controls>
        <PlayButton playing={playing()} onClick={() => setPlaying(!playing())} />
      </Controls>
    </div>
  )
}
