import { Answer } from '@learning/components'
import { createStepComponent, expr, Expression, Step, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { Match, Show, Switch } from 'solid-js'
import * as v from 'valibot'

export const Factor = createStepComponent(
  { expr: 'expr', roots: v.optional(v.array(Expression), []) },
  (props) => (
    <Step
      id={props.id}
      name="Math/Factor/start"
      inputs={{ attempt: 'expr' }}
      feedback={async (inputs) => {
        const { equal, factored } = await allKeyed({
          equal: inputs.attempt.isEqual(props.expr),
          factored: inputs.attempt.isFactored(),
        })
        return { correct: equal && factored, equal, factored, roots: props.roots }
      }}
      prompt={(fields, feedback) => (
        <>
          <p>
            <Show when={props.roots.length > 0} fallback="Factorisez">
              Sachant que {props.roots.map((r) => r.rawInput).join(', ')} sont racines de{' '}
              {tex`${props.expr}`}, factorisez
            </Show>{' '}
            l'expression suivante
          </p>
          <Answer correct={feedback?.correct}>
            {tex`${props.expr} =`} {fields.attempt}
          </Answer>
        </>
      )}
    >
      {(feedback) => (
        <Switch>
          <Match when={feedback.correct}>C'est correct!</Match>
          <Match when={!feedback.correct}>
            <Root expr={props.expr} roots={props.roots} />
          </Match>
        </Switch>
      )}
    </Step>
  ),
)

const Root = createStepComponent(
  { expr: 'expr', roots: v.optional(v.array(Expression), []) },
  (props) => (
    <Step
      id={props.id}
      name="Math/Factor/root"
      inputs={{ root: 'expr' }}
      feedback={({ root }) => ({ correct: props.expr.checkRoot(root), root })}
      prompt={(fields, feedback) => (
        <>
          <p>
            Trouvez une racine de {tex`y = ${props.expr}`}
            <Show when={props.roots.length > 0}>
              {' '}
              qui n'est pas {props.roots.map((r) => r.rawInput).join(', ')}
            </Show>
            .
          </p>
          <Answer correct={feedback?.correct}>
            {tex`x = `} {fields.root}
          </Answer>
        </>
      )}
    >
      {(feedback) => (
        <Switch
          fallback={
            <>
              <p>
                Malheureusement, {tex`${feedback.root}`} n'est pas une racine, puisque en remplaçant{' '}
                {tex`x = ${feedback.root}`}, on obtient
              </p>
              {tex`
              y = ${props.expr.subs({ x: feedback.root })} \\
                = ${props.expr.subs({ x: feedback.root }).simplify()}.
            `}
            </>
          }
        >
          <Match when={feedback.correct}>
            <p>Correct! Tu sais maintenant que la factorisation commence par</p>
            {tex`
            ${props.expr} = (${expr('x - a').subs({ a: feedback.root }).simplify()}) \dots
          `}
            <Factor expr={props.expr} roots={[...props.roots, feedback.root]} />
          </Match>
        </Switch>
      )}
    </Step>
  ),
)
