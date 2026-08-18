import { Attempt, Question } from '@learning/components'
import { Exercise, expr, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { python } from '@learning/repl'
import { allKeyed } from 'es-toolkit'
import { createMemo, createProjection, For, Show } from 'solid-js'

async function getRep(number: string) {
  const code = `from decimal import Decimal\nDecimal(${number})`
  return python.output(code).then((r) => r.result as string)
}

export function Calculator(props: { prompt: string; answer: number | string; inexact?: string[] }) {
  return (
    <PythonCode
      prompt={<p>Utilisez Python pour calculer {tex`${props.prompt}`}</p>}
      tests={[
        {
          test: null,
          check: ({ result }) => result === String(props.answer),
        },
      ]}
      feedback={(ctx) => (
        <Show when={!ctx.correct}>
          <ctx.Self />
        </Show>
      )}
    >
      <Show when={props.inexact !== undefined}>
        <Exercise
          schema={{ data: {}, inputs: { attempt: 'expr' } }}
          data={{}}
          prompt={(ctx) => (
            <>
              <p>Quel aurait été le résultat théorique?</p>
              <Attempt>
                {tex`${props.prompt} =`} {ctx.inputs.attempt}
              </Attempt>
            </>
          )}
          grade={(ctx) => ctx.inputs.attempt.isEqual(props.prompt)}
          feedback={(ctx) => {
            const reps = createProjection(
              () => allKeyed(Object.fromEntries(props.inexact!.map((n) => [n, getRep(n)]))),
              {},
            )
            const realCalc = createMemo(() => {
              let str = props.prompt
              for (const n of props.inexact!) {
                str = str.replaceAll(n, reps[n]!)
              }
              return str
            })
            return (
              <>
                <Show when={!ctx.correct}>
                  <p>On vérifie que</p>
                  {tex`${props.prompt} = ${expr(props.prompt).simplify()}`}
                </Show>
                <Question>Pourquoi la réponse de Python est-elle incorrecte?</Question>
                <p>
                  Puisque l'ordinateur utilise le <strong>binaire</strong>, les nombres suivants ne
                  sont pas représentables exactement en Python:
                </p>
                <table>
                  <thead>
                    <tr>
                      <th class="text-right">Nombre exact</th>
                      <th>Représentation Python</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={props.inexact}>
                      {(n) => (
                        <tr>
                          <td class="text-right">{tex`${n}`}</td>
                          <td>
                            <code>{reps[n]}</code>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
                <p>Ce qui fait que pour Python, le calcul devient en fait</p>
                {tex`
                ${props.prompt}
                  \approx ${realCalc()}
                `}
              </>
            )
          }}
        />
      </Show>
    </PythonCode>
  )
}
