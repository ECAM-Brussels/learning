import { dynamic } from '@solidjs/web'
import { createMemo, untrack, type Component } from 'solid-js'
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
  step: StepComponent<any>
  tags?: readonly T[]
  generate: (random: Random) => P
  render: (params: P) => D
}

/** The `question` helper passed to `defineQuestions`, typing each question against its step. */
export type QuestionHelper = <
  P extends Params,
  S extends StepSchema,
  const T extends string = never,
>(q: {
  step: StepComponent<S>
  tags?: readonly T[]
  generate: (random: Random) => P
  render: (params: P) => InferShape<S['data'], 'input'>
}) => Question<Params, InferShape<S['data'], 'input'>, T>

type QuestionSet = Record<string, Question<any, any, any>>

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (
  i: infer I,
) => void
  ? I
  : never

const question: QuestionHelper = (q) => q as any

/**
 * Define a set of questions, each answered with its own `step`.
 * Sets can be combined into a bank with `createQuestionBank`.
 *
 * @example
 * const arithmetic = defineQuestions((question) => ({
 *   sum: question({
 *     step: MultipleChoice,
 *     tags: ['arithmetic'],
 *     generate: (random) => ({ a: random.int(1, 10), b: random.int(1, 10) }),
 *     render: ({ a, b }) => ({
 *       prompt: <p>Calculez {tex`${a} + ${b}`}</p>,
 *       choices: { [a + b]: a + b, [a * b]: a * b, [a - b]: a - b },
 *       answer: String(a + b),
 *       shuffle: true,
 *     }),
 *   }),
 *   expand: question({
 *     step: Expand,
 *     generate: (random) => ({ a: random.int(1, 10) }),
 *     render: ({ a }) => ({ expr: `(x + ${a})^2` }),
 *   }),
 * }))
 */
export function defineQuestions<Q extends QuestionSet>(define: (question: QuestionHelper) => Q): Q {
  return define(question)
}

/**
 * Create a bank of randomised questions, either from sets made with `defineQuestions`
 * or, as a shortcut for a single set, from the function that defines its questions.
 *
 * @example
 * const bank = createQuestionBank(arithmetic, algebra)
 *
 * <bank.Practice id="arithmetic" tags={['arithmetic']} />
 */
export function createQuestionBank<Q extends QuestionSet>(
  define: (question: QuestionHelper) => Q,
): Bank<Q>
export function createQuestionBank<const Sets extends readonly [QuestionSet, ...QuestionSet[]]>(
  ...sets: Sets
): Bank<UnionToIntersection<Sets[number]>>
export function createQuestionBank(...args: unknown[]) {
  if (typeof args[0] === 'function') {
    return bank(defineQuestions(args[0] as (question: QuestionHelper) => QuestionSet))
  }
  const questions: QuestionSet = {}
  for (const set of args as QuestionSet[]) {
    for (const [kind, question] of Object.entries(set)) {
      if (kind in questions) throw new Error(`The question kind "${kind}" is defined twice`)
      questions[kind] = question
    }
  }
  return bank(questions)
}

type Bank<Q> = Q extends Record<string, unknown> ? ReturnType<typeof bank<Q>> : never

function bank<Q extends Record<string, unknown>>(set: Q) {
  type Kind = keyof Q & string
  type Tag = { [K in Kind]: Q[K] extends Question<any, any, infer T> ? T : never }[Kind]
  type Rendered = { [K in Kind]: Q[K] extends Question<any, infer D, any> ? D : never }[Kind]
  type Data = { kind: Kind; params: Params }
  type Filter = { tags?: readonly Tag[]; kinds?: readonly Kind[] }

  const questions = set as unknown as Record<Kind, Question<Params, Rendered, Tag>>
  const kinds = Object.keys(questions) as [Kind, ...Kind[]]
  const Data = v.object({ kind: v.picklist(kinds), params: Params })

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

  const render = (data: Data): Rendered => questions[data.kind].render(data.params)

  // The kind is saved with the parameters, so that a saved question is restored with its own step.
  const steps = Object.fromEntries(
    kinds.map((kind) => [
      kind,
      createDerivedStep(
        questions[kind].step,
        { kind: v.literal(kind), params: Params },
        ({ params }) => questions[kind].render(params) as any,
      ),
    ]),
  ) as unknown as Record<string, Component<{ data: Data }>>
  function Question(props: { saved: unknown; filter: Filter }) {
    const fresh = untrack(() => generate(props.filter))
    const data = createMemo(() => {
      const saved = v.safeParse(Data, props.saved)
      return saved.success ? (saved.output as Data) : fresh
    })
    const Step = dynamic(() => steps[data().kind])
    return <Step data={data()} />
  }

  /**
   * An endless sequence of questions from the bank, optionally restricted to some tags or kinds.
   * Resubmissions are off by default, as a new question follows each answer.
   */
  function Practice(props: Filter & { id: string; options?: Options<'input'> }) {
    return (
      <Sequence
        id={props.id}
        options={{ allowResubmissions: false, ...props.options }}
        next={(page) => <Question saved={page.saved} filter={props} />}
      />
    )
  }

  return { Practice, generate, render, kinds, available, steps }
}
