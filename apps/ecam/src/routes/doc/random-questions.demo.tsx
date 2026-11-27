import { createQuestionBank, defineSkill, tex } from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'

const power = (k: number) => (k === 1 ? 'x' : `x^{${k}}`)

const powerRule = defineSkill('doc/power-rule', {
  step: MultipleChoice,
  generate: (random) => ({ a: random.int(2, 10), n: random.int(2, 7) }),
  render: ({ a, n }) => ({
    prompt: <p>Quelle est la dérivée de {tex`${a}x^{${n}}`} ?</p>,
    choices: {
      right: tex`${a * n}${power(n - 1)}`,
      exponent: tex`${a}${power(n - 1)}`,
      coefficient: tex`${a * n}x^{${n}}`,
      antiderivative: tex`\frac{${a}}{${n + 1}}x^{${n + 1}}`,
    },
    answer: 'right',
    shuffle: true,
  }),
})

export const bank = createQuestionBank(powerRule)

export const Practice = bank.Practice
