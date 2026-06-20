import { Answer, Feedback } from '@learning/components'
import { createStepComponent, expr, Expression, Step, tex } from '@learning/core'
import { createMemo, Match, Show, Switch } from 'solid-js'
import * as v from 'valibot'
import { Factor } from './Factor'

export const Root = createStepComponent(
  {
    expr: 'expr',
    roots: v.optional(v.array(Expression), []),
    next: v.optional(v.literal('factor')),
  },
  (props) => (
    <Step
      id={props.id}
      name="Math/Factor/root"
      inputs={{ root: 'expr' }}
      feedback={({ root }) => ({ correct: props.expr.checkRoot(root), root })}
      prompt={(ctx) => {
        const missing = createMemo(() => expr('a / b').subs({ a: props.expr }))
        return (
          <>
            <p>
              Trouvez une racine de {tex`y = ${props.expr}`}
              <Show when={props.roots.length > 0}>
                {' '}
                qui n'est pas dans{' '}
                {tex`\left\{ ${props.roots.map((r) => r.rawInput).join(', ')} \right\}`}
              </Show>
              .
            </p>
            <Answer correct={ctx.feedback?.correct}>
              {tex`x = `} {ctx.inputs.root}
            </Answer>
          </>
        )
      }}
    >
      {(feedback) => (
        <Switch>
          <Match when={feedback.correct && props.next === 'factor'}>
            <Feedback>
              <p>Correct! Tu sais maintenant que la factorisation commence par</p>
              {tex`
                ${props.expr} = (${expr('x - a').subs({ a: feedback.root }).simplify()}) \dots
              `}
            </Feedback>
            <Factor expr={props.expr} roots={[...props.roots, feedback.root]} />
          </Match>
          <Match when={!feedback.correct}>
            <Feedback>
              <p>
                Malheureusement, {tex`${feedback.root}`} n'est pas une racine, puisque en remplaçant{' '}
                {tex`x = ${feedback.root}`}, on obtient
              </p>
              {tex`
                y = ${props.expr.subs({ x: feedback.root })} \\
                  = ${props.expr.subs({ x: feedback.root }).simplify()}.
              `}
            </Feedback>
          </Match>
        </Switch>
      )}
    </Step>
  ),
)
export default Root
