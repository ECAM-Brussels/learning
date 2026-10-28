import { Board } from '@learning/components'
import { createDerivedStep, expr, Sequence, tex } from '@learning/core'
import { Expand } from '@learning/exercises/math/algebra/Expand'
import { DerivativeAtPoint } from '@learning/exercises/math/calculus/DerivativeAtPoint'
import { Simple } from '@learning/exercises/math/Simple'
import { PythonCode } from '@learning/exercises/python/Code'
import dedent from 'dedent'
import { createMemo, createSignal, Show } from 'solid-js'
import * as v from 'valibot'

export function FirstExample() {
  return (
    <Expand expr="(x + \epsilon)^2">
      {(ctx) => (
        <Simple
          prompt={
            <p>
              Excellent! Maintenant, imaginons que l'on soit dans un monde où {tex`\epsilon \neq 0`}
              , mais {tex`\epsilon^2 = 0`}. Pouvez-vous encore simplifier l'expression?
            </p>
          }
          label="(x + \epsilon)^2 ="
          grade={(attempt) => ctx.data.expr.taylor('\\epsilon', 0, 1).isEqual(attempt)}
        >
          <p>
            Remarquez que le terme en {tex`\epsilon`} est précisément la <strong>dérivée</strong> de
            l'autre terme,
          </p>
          {tex`
            \underbrace{${ctx.data.expr.subs({ epsilon: 0 }).simplify()}}_{f(x)}
            + \underbrace{${ctx.data.expr.diff('epsilon', 0).simplify()}}_{f'(x)} \epsilon
          `}
          <p>
            Le calcul de la dérivée a été une conséquence <strong>automatique</strong> du fait que{' '}
            {tex`\epsilon^2 = 0`}.
          </p>
        </Simple>
      )}
    </Expand>
  )
}

const DiffAtPoint = createDerivedStep(
  PythonCode,
  { expr: 'expr', a: 'number', check: v.optional(v.boolean()) },
  (props) => ({
    math: true,
    prompt: (
      <p>
        Calculez la dérivée de {tex`\displaystyle f(x) = ${props.expr}`} en{' '}
        {tex`\displaystyle x = ${props.a}`} avec la <strong>dérivation automatique</strong>.
      </p>
    ),
    tests: (expect) => ({
      'Epsilon est utilisé': expect.code.toMatch(/epsilon/),
      '`.dual` est utilisé': expect.code.toMatch(/\.dual/),
      "Le code s'execute sans erreur": expect.not().toError(),
      'Le résultat final est correct': expect.result().toEqualThatOf(dedent /*python */ `
        import numpy as np

        def f(x):
            return ${props.expr.python()}
        
        f(${props.a} + epsilon).dual
      `),
    }),
  }),
  {
    children: (props) => (
      <>
        <p>Vérifions que cela correspond au résultat théorique: {tex`${props.data.expr}`}</p>
        <DerivativeAtPoint f={props.data.expr} x={props.data.a} />
      </>
    ),
  },
)

export function PolynomialSequence() {
  return (
    <Sequence id="polynomial-sequence">
      <DiffAtPoint expr="x^3" a={2} check />
      <DiffAtPoint expr="x^2 + 2x + 1" a={1} />
      <DiffAtPoint expr="(x^3 + 3x^2 + 1) (x^2 + 1)" a={3} />
    </Sequence>
  )
}

export function FunctionExtensionSequence() {
  const display = (a: number, b: number) =>
    `${a !== 0 ? a : ''} ${b > 0 ? (a !== 0 ? '+' : '') : '-'} ${Math.abs(b) === 1 ? '' : Math.abs(b)} \\epsilon`
  const FunctionExtension = createDerivedStep(
    Simple,
    { expr: 'expr', a: 'number', b: 'number' },
    (props) => ({
      prompt: (
        <p>
          Calculez {tex`f(x) = ${props.expr}`} en {tex`x = ${display(props.a, props.b)}`}, en
          laissant vos réponses sous <strong>forme exacte</strong>.
        </p>
      ),
      label: tex`f(${display(props.a, props.b)}) =`,
      grade: (attempt) => {
        const answer = expr('y + m b \\epsilon').subs({
          y: props.expr.subs({ x: props.a }),
          m: props.expr.diff('x', props.a),
          b: props.b,
        })
        return attempt.isEqual(answer)
      },
    }),
  )
  return (
    <Sequence id="function-extension">
      <FunctionExtension expr="\sin(x)" a={2} b={1} />
      <FunctionExtension expr="e^x" a={1} b={1} />
      <FunctionExtension expr="x^2" a={2} b={3} />
      <FunctionExtension expr="e^x" a={1} b={-1} />
      <FunctionExtension expr="\sin(x)" a={0} b={1} />
    </Sequence>
  )
}

export function AutomaticDifferentiation() {
  return (
    <Sequence id="automatic-differentiation-with-python">
      <DiffAtPoint expr="\cos(x^3)" a={2} />
      <DiffAtPoint expr="e^{-x^2}" a={1} />
      <DiffAtPoint expr="\frac{x^2 + 1}{x - 1}" a={3} />
    </Sequence>
  )
}

export function NewtonRaphsonAnimation(props: { twoIterations?: boolean }) {
  const [a, setA] = createSignal(1.5)
  const f = (x: number) => 0.5 * (x ** 2 - 9)
  const df = (x: number) => x
  const t = createMemo(() => (x: number) => f(a()) + df(a()) * (x - a()))
  const t2 = createMemo(() => (x: number) => f(root()) + df(root()) * (x - root()))
  const root = () => a() - f(a()) / df(a())
  const root2 = () => root() - f(root()) / df(root())
  return (
    <>
      <h4 class="text-center">
        <Show when={props.twoIterations} fallback="Première itération">
          Deux itérations
        </Show>{' '}
        de la méthode de Newton-Raphson
      </h4>
      <Board axis>
        <Board.Plot fn={t()} color="green" />
        <Board.Point position={[a(), 0]} fixed name="x_0" color="gray" />
        <Board.Segment from={[a(), 0]} to={[a(), f(a())]} color="gray" dash={1} />
        <Board.Plot fn={(x) => 0.5 * (x ** 2 - 9)}>
          {(curve) => (
            <Board.Glider
              position={[a(), f(a())]}
              on={curve}
              onDrag={(P) => setA(P.X())}
              name="\text{(bougez-moi)}"
            />
          )}
        </Board.Plot>
        <Board.Point
          position={[root(), 0]}
          fixed
          name="x_1"
          color={props.twoIterations ? 'gray' : 'red'}
          withLabel={props.twoIterations}
        />
        <Show when={props.twoIterations}>
          <Board.Point position={[root(), f(root())]} fixed withLabel={false} color="gray" />
          <Board.Plot fn={t2()} color="green" />
          <Board.Segment from={[root(), 0]} to={[root(), f(root())]} color="gray" dash={1} />
          <Board.Point position={[root2(), 0]} fixed name="x_2" color="red" />
        </Show>
      </Board>
      <p class="text-center">
        Utilisation de la tangente en {tex`x = ${a()}`} pour trouver l'approximation de la racine{' '}
        {tex`x = ${props.twoIterations ? root2() : root()}`}
      </p>
    </>
  )
}
