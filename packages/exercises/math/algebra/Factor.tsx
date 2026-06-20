import { Answer, Feedback } from '@learning/components'
import { createStepComponent, expr, Expression, Step, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { createMemo, Match, Switch } from 'solid-js'
import * as v from 'valibot'
import { Root } from './Root'

export const Factor = createStepComponent(
  {
    expr: 'expr',
    factors: v.pipe(v.optional(v.array(Expression), []), v.title('Facteurs déjà trouvés')),
  },
  (props) => {
    const start = createMemo(() =>
      expr({ json: ['Multiply', ...props.factors.map((f) => f.json)] }),
    )
    const remaining = createMemo(() => expr('a / b').subs({ a: props.expr, b: start() }))
    return (
      <Step
        id={props.id}
        name="algebra/math/factor"
        inputs={{ attempt: 'expr' }}
        feedback={async (inputs) => {
          const { equal, factored } = await allKeyed({
            equal: inputs.attempt.isEqual(remaining()),
            factored: inputs.attempt.isFactored(),
          })
          return {
            attempt: inputs.attempt,
            correct: equal && factored,
            equal,
            factored,
            isMultiple: expr('a / b')
              .subs({ a: props.expr, b: inputs.attempt })
              .simplify()
              .diff()
              .isEqual(0),
          }
        }}
        prompt={(ctx) => (
          <>
            <p>Factorisez l'expression suivante</p>
            <Answer>
              {tex`${props.expr} = ${start()}`} {ctx.inputs.attempt}
            </Answer>
          </>
        )}
      >
        {(feedback) => (
          <Switch>
            <Match when={feedback.correct}>C'est correct!</Match>
            <Match when={feedback.isMultiple}>
              <Feedback>
                <p>
                  La réponse est <em>presque</em> correcte. N'oublie pas qu'une expression et sa
                  factorisation doivent être <em>égales</em>. Pour le moment,
                </p>
                {tex`
                ${feedback.attempt} = ${feedback.attempt.expand()}
              `}
                <p>Tu n'aurais pas oublié un facteur?</p>
              </Feedback>
              <Factor {...props} />
            </Match>
            <Match when={!feedback.correct}>
              <Root expr={props.expr} factors={props.roots} />
            </Match>
          </Switch>
        )}
      </Step>
    )
  },
)
