import { expr, tex } from '@learning/core'
import { Expand } from '@learning/exercises/math/algebra/Expand'
import { Simple } from '@learning/exercises/math/Simple'

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

export function RootFormula() {
  return (
    <Simple
      id="root-formula"
      prompt={
        <p>
          Déterminez la racine {tex`x_1`} de {tex`\displaystyle y = m (x - x_0) + y_0`}
        </p>
      }
      label="x_1 ="
      tex
      grade={(attempt) => expr('x_0 - y_0 / m').isEqual(attempt)}
    >
      <p>La racine de la fonction est {tex`\displaystyle x = x_0 - \frac{y_0}{m}`}.</p>
    </Simple>
  )
}
