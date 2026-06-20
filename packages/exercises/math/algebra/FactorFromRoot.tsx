import { createStepComponent, expr, Step } from '@learning/core'

export const FactorFromRoot = createStepComponent({ root: 'expr' }, (props) => (
  <Step
    id={props.id}
    name="math/algebra/factor-from-root"
    inputs={{ factor: 'expr' }}
    feedback={(inputs) => ({
      correct: expr('x - a').subs({ a: props.root }).isEqual(inputs.factor),
    })}
    prompt={(ctx) => (
      <>
        <p>Trouve</p>
      </>
    )}
  ></Step>
))
