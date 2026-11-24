import * as v from 'valibot'
import { createRandom, type Random } from '../random'
import { createDerivedStep, type InferShape, type StepComponent, type StepSchema } from './base'
import type { Options } from './options'
import { Sequence } from './sequence'

type Params = Record<string, number | string | boolean>
const Params = v.record(v.string(), v.union([v.number(), v.string(), v.boolean()]))

/**
 * A family of questions generated from a few parameters.
 *
 * Only the parameters are saved, so `render` must be pure:
 * the same parameters must always give the same question.
 */
export type Question<P extends Params, D, T extends string = string> = {
  tags?: readonly T[]
  generate: (random: Random) => P
  render: (params: P) => D
}

/**
 * Create a bank of randomised questions answered with `step`.
 *
 * @example
 * const bank = createQuestionBank(MultipleChoice, (question) => ({
 *   sum: question({
 *     tags: ['arithmetic'],
 *     generate: (random) => ({ a: random.int(1, 10), b: random.int(1, 10) }),
 *     render: ({ a, b }) => ({
 *       prompt: <p>Calculez {tex`${a} + ${b}`}</p>,
 *       choices: { [a + b]: a + b, [a * b]: a * b, [a - b]: a - b },
 *       answer: String(a + b),
 *       shuffle: true,
 *     }),
 *   }),
 * }))
 *
 * <bank.Practice id="arithmetic" tags={['arithmetic']} />
 */
export function createQuestionBank<S extends StepSchema, Q extends Record<string, unknown>>(
  step: StepComponent<S>,
  define: (
    question: <P extends Params, const T extends string = never>(
      q: Question<P, InferShape<S['data'], 'input'>, T>,
    ) => Question<Params, InferShape<S['data'], 'input'>, T>,
  ) => Q,
) {
  type Kind = keyof Q & string
  type Tag = { [K in Kind]: Q[K] extends Question<any, any, infer T> ? T : never }[Kind]
  type Data = { kind: Kind; params: Params }
  type Filter = { tags?: readonly Tag[]; kinds?: readonly Kind[] }

  const questions = define((q) => q as any) as unknown as Record<
    Kind,
    Question<Params, InferShape<S['data'], 'input'>, Tag>
  >
  const kinds = Object.keys(questions) as [Kind, ...Kind[]]

  function available(filter: Filter = {}) {
    return kinds.filter(
      (kind) =>
        (!filter.kinds || filter.kinds.includes(kind)) &&
        (!filter.tags || questions[kind].tags?.some((tag) => filter.tags!.includes(tag))),
    )
  }

  function generate(filter: Filter = {}, seed?: string | number): Data {
    const random = createRandom(seed)
    const kind = random.sample(available(filter))
    return { kind, params: questions[kind].generate(random) }
  }

  const render = (data: Data) => questions[data.kind].render(data.params)

  const BankStep = createDerivedStep(step, { kind: v.picklist(kinds), params: Params }, render)

  /**
   * An endless sequence of questions from the bank, optionally restricted to some tags or kinds.
   * Resubmissions are off by default, as a new question follows each answer.
   */
  function Practice(props: Filter & { id: string; options?: Options<'input'> }) {
    return (
      <Sequence
        id={props.id}
        options={{ allowResubmissions: false, ...props.options }}
        exercise={BankStep}
        next={() => generate(props)}
      />
    )
  }

  return { Step: BankStep, Practice, generate, render, kinds, available }
}
