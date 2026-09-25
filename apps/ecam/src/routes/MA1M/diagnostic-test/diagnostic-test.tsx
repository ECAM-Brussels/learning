import { createDerivedStep, Sequence, tex } from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import type { JSX } from '@solidjs/web'
import * as v from 'valibot'
import triangleImage from './triangle.png'

function DiagnosticTest() {
  return (
    <>
      <div>
        <h1>Diagnostic Test</h1>
        <p>This is a simple diagnostic test component.</p>
      </div>
      <Sequence id="diagnostic-test">
        <TrueOrFalse prompt={tex`\sin(\pi-x) = -\sin x`} answer={false} />
        <MultipleChoice
          prompt={
            <>
              <p class="m-0">
                On considère le triangle isocèle suivant, où le coté {tex`AB`} mesure 5 cm.
              </p>
              <div class="mt-0 flex justify-center">
                <img src={triangleImage} alt="Triangle isocèle" class="block h-auto w-90" />
              </div>
              <p>Quelle est la longueur du coté {tex`AC`} ?</p>
            </>
          }
          choices={{
            A: <>{tex`\frac{5\sqrt{5}}{2}`}</>,
            B: <>{tex`\frac{5\sqrt{6}}{2}`}</>,
            C: <>{tex`5\sqrt{2}`}</>,
            D: <>{tex`5\sqrt{3}`}</>,
          }}
          grade={(sel) => sel.equals(['D'])}
        />
        <TrueOrFalse prompt={tex`\sin(\pi-x) = -\sin x`} answer={false} />
        <TrueOrFalse
          prompt={
            <p>
              pour tous vecteurs {tex`\vec{a}`} et {tex`\vec{b}`}, on a{' '}
              {tex`\left\lVert\vec{a} + \vec{b}\right\rVert = \lVert\vec{a}\rVert + \lVert\vec{b}\rVert`}
            </p>
          }
          answer={false}
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
          prompt={<p>Que vaut {tex`1 + 1`} ?</p>}
          choices={{
            A: 'A',
            B: <code>B</code>,
            C: <>Option C</>,
          }}
          grade={(sel) => sel.equals(['A'])}
        />
      </Sequence>
    </>
  )
}

const TrueOrFalse = createDerivedStep(
  MultipleChoice,
  { prompt: v.custom<JSX.Element>(() => true), answer: v.boolean() },
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
