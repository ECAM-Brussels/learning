import { Attempt, Heading } from '@learning/components'
import {
  createDerivedStep,
  Exercise,
  ExerciseOptions,
  expr,
  hasPermissions,
  Sequence,
  tex,
} from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { useSearchParams, type RouteDefinition } from '@solidjs/router'
import { allKeyed, sampleSize } from 'es-toolkit'
import { sample } from 'es-toolkit/array'
import { createMemo, createSignal, Show } from 'solid-js'
import * as v from 'valibot'
import { paths } from '../../../router'
import triangleImage from './triangle.png'

export const route = {
  search: v.object({
    group: v.optional(v.union([v.literal('A'), v.literal('B')]), 'A'),
  }),
} satisfies RouteDefinition

function DiagnosticTest() {
  const [params] = useSearchParams(paths.MA1M['diagnostic-test'])
  const date = () => (params.group === 'A' ? '2026-10-09 15:30' : '2026-10-09 13:45')
  const [showFeedback, setShowFeedback] = createSignal(false)
  const authorized = createMemo(() => hasPermissions(['draft:read']))
  return (
    <ExerciseOptions showFeedback={showFeedback() ? true : date()} readOnly={date()}>
      <Show when={authorized()}>
        <label>
          <input type="checkbox" onChange={(e) => setShowFeedback(e.target.checked)} /> Montrer le
          feedback
        </label>
      </Show>
      <Heading level={1}>Test diagnostique {params.group}</Heading>
      <Heading level={2}>Trigonométrie</Heading>
      <Sequence id="diagnostic-test-trigonometry">
        <TrueOrFalse
          prompt={params.group === 'A' ? tex`\sin(\pi-x) = -\sin x` : tex`\cos(\pi-x) = \cos x`}
          answer={false}
        />
        <MultipleChoice
          prompt={
            <>
              <p>On considère le triangle isocèle suivant, où le coté {tex`AB`} mesure 5 cm.</p>
              <img
                src={triangleImage}
                alt="Triangle isocèle"
                class="mx-auto my-4 block h-auto w-90"
              />
              <p>Quelle est la longueur du coté {tex`AC`} ?</p>
            </>
          }
          choices={{
            A: tex`\frac{5\sqrt{5}}{2}`,
            B: tex`\frac{5\sqrt{6}}{2}`,
            C: tex`5\sqrt{2}`,
            D: tex`5\sqrt{3}`,
          }}
          grade={(sel) => sel.equals(['D'])}
        />
        <Exercise
          schema={{ data: { equation: 'expr' }, inputs: { attempt: 'expr' } }}
          data={() => {
            const a = sample([-3, -2, -1, 2, 3])
            const b = sample([
              `\\frac{\\pi}{3}`,
              `\\frac{\\pi}{6}`,
              `-\\frac{\\pi}{3}`,
              `-\\frac{\\pi}{6}`,
            ])
            const c = sample([
              `-\\frac{1}{2}`,
              `\\frac{1}{2}`,
              `-\\frac{\\sqrt{3}}{2}`,
              `\\frac{\\sqrt{3}}{2}`,
              `-\\frac{\\sqrt{2}}{2}`,
              `\\frac{\\sqrt{2}}{2}`,
            ])
            return { equation: expr(`\\sin(ax + b) = c`).subs({ a, b, c }).simplify() }
          }}
          prompt={(ctx) => (
            <>
              <p>Déterminez une solution de l'équation :</p>
              {tex`${ctx.data.equation}
                `}
              <p>
                <Attempt class="justify-start">
                  {tex`x=`}
                  {ctx.inputs.attempt}
                </Attempt>
              </p>
            </>
          )}
          grade={(ctx) => ctx.data.equation.subs({ x: ctx.inputs.attempt }).isTrue()}
        />
      </Sequence>
      <Heading level={2}>Vecteurs</Heading>
      <Sequence id="diagnostic-test-vectors">
        <TrueOrFalse
          prompt={
            <p>
              pour tous vecteurs {tex`\vec{a}`} et {tex`\vec{b}`}, on a{' '}
              {tex`\left\lVert\vec{a} + \vec{b}\right\rVert = \lVert\vec{a}\rVert + \lVert\vec{b}\rVert`}
            </p>
          }
          answer={false}
        />
        <Exercise
          schema={{ data: { u: 'expr', v: 'expr', a: 'expr' }, inputs: { attempt: 'expr' } }}
          data={() => ({
            u: sample([2, 3, 4, 5, 6]),
            v: sample([2, 3, 4, 5, 6]),
            a: sample([30, 45, 60, 120, 135, 150]),
          })}
          prompt={(ctx) => {
            return (
              <>
                <p>
                  Calculez le produit scalaire de {tex`\vec{u}`} et {tex`\vec{v}`} sachant que{' '}
                  {tex`\lVert\vec{u}\rVert = ${ctx.data.u}, \lVert\vec{v}\rVert = ${ctx.data.v}`} et
                  que l'angle entre ces deux vecteurs est de {tex`${ctx.data.a}`} degrés.
                </p>
                <p class="mt-4">
                  <Attempt>
                    {tex`\vec{u} \cdot \vec{v} =`} {ctx.inputs.attempt}
                  </Attempt>
                </p>
              </>
            )
          }}
          grade={(ctx) =>
            expr(`u * v * \\cos(b)`)
              .subs({ ...ctx.data, b: expr(`${ctx.data.a} * \\pi / 180`) })
              .isEqual(ctx.inputs.attempt)
          }
          feedback={(ctx) => (
            <>
              <p>Le produit scalaire est :</p>
              <div class="flex justify-center">
                {tex`\vec{u} \cdot \vec{v}
                = ${expr(tex.raw`u v \cos{\frac{a \pi}{180}}`).subs(ctx.data)}
                = ${expr(tex.raw`u v \cos{\frac{a \pi}{180}}`)
                  .subs(ctx.data)
                  .simplify()}`}
              </div>
            </>
          )}
        />
        <TrueOrFalse
          prompt={
            <p>
              si {tex`\vec{u} \times \vec{v} = \vec{0}`}, alors {tex`\vec{u} = \vec{0}`} ou{' '}
              {tex`\vec{v} = \vec{0}`}
            </p>
          }
          answer={false}
        />
        <MultipleChoice
          prompt={
            <>
              <p>En utilisant les propriétés, calculez:</p>
              <div class="flex justify-center">
                {tex`\left(\overrightarrow{1_x}+\overrightarrow{1_z}\right) \times \left(\overrightarrow{1_x} \times\overrightarrow{1_y}\right)`}
              </div>
              <p>Cochez la bonne réponse:</p>
            </>
          }
          choices={{
            A: tex`\overrightarrow{1_y}`,
            B: tex`-\overrightarrow{1_y}`,
            C: tex`1`,
            D: tex`\vec{0}`,
            E: <>Cette expression n'a pas de sens</>,
          }}
          grade={(sel) => sel.equals(['B'])}
        />
      </Sequence>
      <Heading level={2}>Algèbre</Heading>
      <Sequence id="diagnostic-test-algebra">
        <Exercise
          schema={{ data: { a: 'expr' }, inputs: { attempt: 'expr' } }}
          data={() => ({ a: sample([21, 22, 23, 24]) })}
          prompt={(ctx) => {
            const amount = () => expr(`9 a`).subs(ctx.data).simplify()
            return (
              <>
                <p>
                  Isabelle dépense {tex`\frac{3}{5}`} de ses économies pour offrir un cadeau à sa
                  meilleure amie. Elle dépense les {tex`\frac{3}{4}`} de ce qui lui reste pour
                  offrir un cadeau à son prof de maths. Sachant qu'elle a en tout dépensé{' '}
                  {tex`${amount()}`} &euro;, combien d'argent lui reste-t-elle ?
                </p>
                <p class="mt-4">
                  <Attempt>Il lui reste {ctx.inputs.attempt} &euro;.</Attempt>
                </p>
              </>
            )
          }}
          grade={(ctx) => ctx.inputs.attempt.isEqual(ctx.data.a)}
        />
        <TrueOrFalse
          prompt={
            params.group === 'A' ? (
              <p>
                {tex`\sqrt{x^2-16} = x-4`} pour tout réel {tex`x`}
              </p>
            ) : (
              <p>
                {tex`\sqrt{x^2-25} = x-5`} pour tout réel {tex`x`}
              </p>
            )
          }
          answer={false}
        />
        <MultipleChoice
          data={() => {
            const b = sample([3, 4, 5, 6, 7, 8])
            return {
              prompt: (
                <>
                  <p>
                    Pour un nombre {tex`a\in \mathbb{R}`}, quelle est la distance entre {tex`a`} et{' '}
                    {tex`${b}`} ?
                  </p>
                </>
              ),
              choices: {
                A: <>{tex`${b}-a`}</>,
                B: <>{tex`a-${b}`}</>,
                C: <>{tex`|a-${b}|`}</>,
                D: <>{tex`|${b}+a|`}</>,
                E: <>{tex`|a|-|${b}|`}</>,
              },
              grade: (sel) => sel.equals(['C']),
            }
          }}
        />
        <Exercise
          schema={{ data: { a: 'expr', b: 'expr', c: 'expr' }, inputs: { attempt: 'expr' } }}
          data={() => ({
            a: sample([-3, -2, 2, 3]),
            b: sample([-3, -4, -5, -6, 3, 4, 5, 6]),
            c: sample([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
          })}
          prompt={(ctx) => {
            const expression = () => expr(`a (x - b)^2 + c`).subs(ctx.data).expand()
            return (
              <>
                <p>Complétez le carré:</p>
                <p>
                  <Attempt>
                    {tex`${expression()} = `} {ctx.inputs.attempt}
                  </Attempt>
                </p>
              </>
            )
          }}
          grade={async (ctx) => {
            if (ctx.inputs.attempt.count('x') !== 1) return false
            return expr(`a (x - b)^2 + c`).subs(ctx.data).isEqual(ctx.inputs.attempt)
          }}
        />
        <Exercise
          schema={{
            data: { equation1: 'expr', equation2: 'expr' },
            inputs: { x: 'expr', y: 'expr' },
          }}
          data={() =>
            params.group === 'A'
              ? { equation1: '-4x + 3y = 20', equation2: '-x + y = 6' }
              : { equation1: '2x - 3y = 5', equation2: 'x - y = 4' }
          }
          prompt={(ctx) => (
            <>
              <p>Résolvez le système d'équations suivant :</p>
              <div class="flex justify-center">
                {tex`\left\{\begin{array}{l} ${ctx.data.equation1} \\ ${ctx.data.equation2} \end{array}\right.`}
              </div>
              <p>
                <Attempt class="justify-start">
                  {tex`x =`} {ctx.inputs.x}, {tex`y =`} {ctx.inputs.y}
                </Attempt>
              </p>
            </>
          )}
          grade={async (ctx) => {
            const tests = await allKeyed({
              first: ctx.data.equation1.subs(ctx.inputs).isTrue(),
              second: ctx.data.equation2.subs(ctx.inputs).isTrue(),
            })
            return tests.first && tests.second
          }}
        />
        <TrueOrFalse
          prompt={
            <p>
              Lors de la résolution d'un système linéaire à trois équations et trois inconnues,
              supposons qu'on obtient par la méthode de Gauss la forme réduite suivante :
              {tex`\left\{
              \begin{array}{rcl}
              x - y + 4z & = & 6 \\
              2y - 3z & = & 5 \\
              0 & = & 0
              \end{array} \right.`}
              Cela veut dire que {tex`z = 0`}.
            </p>
          }
          answer={false}
        />
      </Sequence>
      <Heading level={2}>Géométrie</Heading>
      <Sequence id="diagnostic-test-geometry">
        <Exercise
          schema={{ data: { u: 'expr', v: 'expr', w: 'expr' }, inputs: { attempt: 'expr' } }}
          data={() => ({
            u: sample([3]),
            v: sample([4]),
            w: sample([12]),
          })}
          prompt={(ctx) => {
            return (
              <>
                <p>
                  Une boîte rectangulaire a pour dimensions {tex`${ctx.data.u}`} cm x{' '}
                  {tex`${ctx.data.v}`} cm x {tex`${ctx.data.w}`} cm. Quelle est la longueur du plus
                  grand segment que l'on peut tracer entre un sommet de la boîte et le sommet opposé
                  ?
                </p>
                <p class="mt-4">
                  <Attempt>
                    {ctx.inputs.attempt} cm{' '}
                    <i>(vous pouvez introduire un nombre, ou alors un calcul)</i>
                  </Attempt>
                </p>
              </>
            )
          }}
          grade={(ctx) =>
            expr(`\\sqrt{u^2 + v^2 + w^2}`).subs(ctx.data).isEqual(ctx.inputs.attempt)
          }
        />
        <Exercise
          schema={{
            data: { a: 'expr', b: 'expr', c: 'expr', x1: 'expr', y1: 'expr' },
            inputs: { attempt: 'expr' },
          }}
          data={() => {
            const [a, b] = sampleSize([-8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8], 2) as [
              number,
              number,
            ]
            return {
              a,
              b,
              c: sample([-8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]),
              x1: sample([3, 5, 7]),
              y1: sample([-6, -4, -2]),
            }
          }}
          prompt={(ctx) => {
            const equation = () => expr(`a x + b y = c`).subs(ctx.data).simplify()
            return (
              <>
                <p>
                  Déterminez une équation de la droite passant par le point{' '}
                  {tex`\left(${ctx.data.x1}, ${ctx.data.y1}\right)`}, et perpendiculaire à la droite
                  d'équation {tex`${equation()}`}.
                </p>
                <p class="mt-4">
                  <Attempt>{ctx.inputs.attempt}</Attempt>
                </p>
              </>
            )
          }}
          grade={(ctx) =>
            expr(`-b(x - x_1) + a(y - y_1) = 0`)
              .subs({ ...ctx.data, x_1: ctx.data.x1, y_1: ctx.data.y1 })
              .isEquivalent(ctx.inputs.attempt)
          }
        />
        <MultipleChoice
          prompt={
            <>
              <p>Pour translater une conique de 3 vers la droite, on remplace {tex`x`} par:</p>
            </>
          }
          choices={{
            A: tex`x-3`,
            B: tex`x+3`,
            C: tex`\frac{x}{3}`,
            D: tex`-\frac{x}{3}`,
          }}
          grade={(sel) => sel.equals(['A'])}
        />
      </Sequence>
    </ExerciseOptions>
  )
}

const TrueOrFalse = createDerivedStep(
  MultipleChoice,
  { prompt: 'jsx', answer: v.boolean() },
  (props) => ({
    prompt: (
      <div>
        <p>Vrai ou faux:</p>
        <p>{props.prompt}</p>
      </div>
    ),
    choices: new Map([
      ['A', 'Vrai'],
      ['B', 'Faux'],
    ]),
    grade: (sel) => sel.equals([props.answer ? 'A' : 'B']),
  }),
)

export default DiagnosticTest
