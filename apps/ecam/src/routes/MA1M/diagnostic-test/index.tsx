import { Attempt } from '@learning/components'
import { createDerivedStep, Exercise, expr, Sequence, tex } from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { allKeyed } from 'es-toolkit'
import { sample } from 'es-toolkit/array'
import * as v from 'valibot'
import triangleImage from './triangle.png'

function countSymbol(value: unknown, symbol: string): number {
  if (value === symbol) return 1
  if (!Array.isArray(value)) return 0
  return value.reduce((count, child) => count + countSymbol(child, symbol), 0)
}

function DiagnosticTest() {
  return (
    <>
      <div>
        <h1>Test diagnostique</h1>
        <h2>Trigonométrie</h2>
      </div>

      <Exercise
        id="system-two-equations"
        schema={{
          data: { equation1: 'expr', equation2: 'expr' },
          inputs: { x: 'expr', y: 'expr' },
        }}
        data={{ equation1: '-4x + 3y = 20', equation2: '-x + y = 6' }}
        prompt={(ctx) => (
          <>
            <p>Résolvez le système d'équations suivant :</p>
            <div class="flex justify-center">
              {tex`\left\{\begin{array}{l} ${ctx.data.equation1} \\ ${ctx.data.equation2} \end{array}\right.`}
            </div>
            <p>
              <Attempt class="text-lg text-red-600">
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

      <Sequence
        id="diagnostic-test-trigonometry"
        options={{ showFeedback: new Date('2026-10-02 12:13') }}
      >
        <TrueOrFalse prompt={tex`\sin(\pi-x) = -\sin x`} answer={false} />
        <MultipleChoice
          prompt={
            <>
              <p>On considère le triangle isocèle suivant, où le coté {tex`AB`} mesure 5 cm.</p>
              <img src={triangleImage} alt="Triangle isocèle" class="mx-auto block h-auto w-90" />
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
      <div>
        <h2>Vecteurs</h2>
      </div>
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
                <p>
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
              si {tex`\vec{u} \times \vec{v}`}, alors {tex`\vec{u} = \vec{0}`} ou{' '}
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
            C: <>{tex`1`}</>,
            D: <>{tex`\vec{0}`}</>,
            E: <>Cette expression n'a pas de sens</>,
          }}
          grade={(sel) => sel.equals(['B'])}
        />
      </Sequence>
      <div>
        <h2>Algèbre</h2>
      </div>
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
                <p>
                  <Attempt>Il lui reste {ctx.inputs.attempt} &euro;.</Attempt>
                </p>
              </>
            )
          }}
          grade={(ctx) => expr(`${ctx.inputs.attempt}`).isEqual(expr(`${ctx.data.a}`))}
        />
        <TrueOrFalse
          prompt={
            <p>
              {tex`\sqrt{x^2-16} = x-4`} pour tout réel {tex`x`}
            </p>
          }
          answer={false}
        />
        <MultipleChoice
          data={() => {
            const b = sample([5])
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
            if (countSymbol(ctx.inputs.attempt.json, 'x') !== 1) return false
            return expr(`a (x - b)^2 + c`).subs(ctx.data).isEqual(ctx.inputs.attempt)
          }}
        />
      </Sequence>
    </>
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
