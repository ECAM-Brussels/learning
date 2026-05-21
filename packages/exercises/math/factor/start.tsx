import CheckMark from '@learning/components/CheckMark'
import { tex } from '@learning/components/Latex'
import { expr, type Feedback, type View } from '@learning/core'
import { filterAsync } from 'es-toolkit'
import { createMemo, For, Show } from 'solid-js'
import type { schema } from '../factor'

export const feedback: Feedback<typeof schema, 'start'> = async ({
  question: { expr: question },
  state: { attempt },
}) => {
  const [equal, factored] = await Promise.all([attempt.isEqual(question), attempt.isFactored()])
  const correct = equal && factored
  return { correct, score: [Number(correct), 1], next: correct ? null : 'root' }
}

export const Component: View<typeof schema, 'start'> = (props, { Field, Feedback }) => (
  <>
    <p>
      Factorisez <strong>complètement</strong> l'expression suivante:
    </p>
    <div class="flex items-center justify-center gap-1">
      {tex.block`${props.question.expr} =`}
      <Field name="state.attempt" />
      <CheckMark value={props.correct} />
    </div>
    <Feedback>
      {() => {
        const attempt = createMemo(() => props.state!.attempt)
        const equal = createMemo(() => props.question.expr.isEqual(attempt()!))
        const factored = createMemo(() => attempt().isFactored())
        const isExpansionUseful = createMemo(async () => {
          const [expanded, tex] = await Promise.all([attempt().expand().latex(), attempt().latex()])
          return expanded !== tex
        })
        return (
          <ul class="list-disc pl-4">
            <Show
              when={!equal()}
              fallback={<p>L'expression entrée est bien égale à celle de l'énoncé.</p>}
            >
              <li>
                <p>L'expression entrée n'est pas égale à celle de l'énoncé.</p>
                <Show when={isExpansionUseful()}>
                  <p>On vérifie en effet que</p>
                  {tex.block`${attempt().rawInput} = ${attempt().expand()},`}
                  <p>qui n'est pas égal à {tex`${props.question.expr.rawInput}`}.</p>
                </Show>
              </li>
            </Show>
            <Show when={!factored()}>
              {(_) => {
                const isProduct = createMemo(() => ['Multiply', 'Power'].includes(attempt().func()))
                const unfactoredTerms = createMemo(() =>
                  filterAsync(
                    attempt().args().map(expr),
                    async (term) => !(await term.isFactored()),
                  ),
                )
                return (
                  <li>
                    <Show
                      when={isProduct()}
                      fallback={<p>L'expression entrée n'est pas un produit.</p>}
                    >
                      <p>
                        {unfactoredTerms()?.length > 1
                          ? 'Les termes suivants ne sont pas complètement factorisés: '
                          : "Le terme suivant n'est pas complètement factorisé: "}
                        <For each={unfactoredTerms() ?? []}>{(term) => tex`${term()}`}</For>
                      </p>
                    </Show>
                  </li>
                )
              }}
            </Show>
          </ul>
        )
      }}
    </Feedback>
  </>
)
