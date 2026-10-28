import { createDerivedStep, expr, Sequence, tex } from '@learning/core'
import { Expand } from '@learning/exercises/math/algebra/Expand'
import { Simple } from '@learning/exercises/math/Simple'
import { PythonCode } from '@learning/exercises/python/Code'
import dedent from 'dedent'

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

export function Rules() {
  return (
    <Simple
      id="product-rule"
      prompt={
        <p>
          Calculez le produit {tex`(a + b \epsilon)(c + d \epsilon)`} en utilisant{' '}
          {tex`\epsilon^2 = 0`}
        </p>
      }
      grade={(attempt) => attempt.isEqual('ac + (ad+bc) \\epsilon')}
    >
      <p>
        Remarquez que si {tex`a = f(x)`}, {tex`b = f'(x)`}, {tex`c = g(x)`} et {tex`d = g'(x)`},
        alors on a en fait
      </p>
      {tex`
        \underbrace{(f(x) + f'(x) \epsilon)}_{a + b \epsilon}
        \underbrace{(g(x) + g'(x) \epsilon)}_{c + d \epsilon}
        = \underbrace{f(x) g(x)}_{a c} + \underbrace{\color{green} (f'(x) g(x) + f(x) g'(x))}_{a d + b c} \epsilon
      `}
      <p>
        En imposant {tex`\epsilon^2 = 0`}, on enseigne à l'ordinateur à calculer la dérivée d'un
        produit automatiquement.
      </p>
    </Simple>
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
  const DiffAtPoint = createDerivedStep(PythonCode, { expr: 'expr', a: 'number' }, (props) => ({
    math: true,
    prompt: (
      <p>
        Calculez la dérivée de {tex`f(x) = ${props.expr}`} en {tex`x = ${props.a}`}
      </p>
    ),
    tests: (expect) => [
      expect('La variable epsilon est utilisée')
        .code()
        .toMatch(/epsilon/),
      expect('La propriété `dual` est utilisée')
        .code()
        .toMatch(/\.dual/),
      expect("Le code s'execute sans erreur").not().toError(),
      expect('Le résultat final est correct').result().toEqualThatOf(dedent /*python */ `
        import numpy as np

        def f(x):
            return ${props.expr.python()}
        
        f(${props.a} + epsilon).dual
      `),
    ],
  }))
  return (
    <Sequence id="automatic-differentiation-with-python">
      <DiffAtPoint expr="\cos(x^3)" a={2} />
      <DiffAtPoint expr="e^{-x^2}" a={1} />
    </Sequence>
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
