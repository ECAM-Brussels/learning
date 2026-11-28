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
 * What a student practises, through questions generated from a few parameters.
 *
 * Only the parameters are saved, so `render` must be pure:
 * the same parameters must always give the same question.
 */
export type Skill<Id extends string, D, T extends string = string> = {
  /** Saved with the answers, so it must not change once students have answered. */
  id: Id
  step: StepComponent<any>
  tags?: readonly T[]
  prerequisites?: () => readonly AnySkill[]
  generate: (random: Random) => Params
  render: (params: Params) => D
}

type AnySkill = Skill<string, any, any>

/**
 * Defines a skill: questions of one kind, generated from a few random parameters.
 *
 * - `id`: saved with the answers, namespaced by course like `'MA1M/power-rule'`: never change it;
 * - `step`: the exercise that asks the question, such as `MultipleChoice` or `Simple`;
 * - `generate`: draws the parameters, only from the `random` it receives, never from `Math.random`;
 * - `render`: turns the parameters into the step's data, and must be pure,
 *   since only the parameters are saved and the question is rebuilt from them;
 * - `tags`: labels to group skills, as in `<bank.Practice tags={['s1']} />`;
 * - `prerequisites`: the skills that come before, read lazily so that modules may refer to each other's skills.
 *
 * @example
 * export const addition = defineSkill('arithmetic/addition', {
 *   step: MultipleChoice,
 *   prerequisites: () => [counting],
 *   generate: (random) => ({ a: random.int(1, 10), b: random.int(1, 10) }),
 *   render: ({ a, b }) => ({
 *     prompt: <p>Calculez {tex`${a} + ${b}`}</p>,
 *     choices: { [a + b]: a + b, [a * b]: a * b, [a - b]: a - b },
 *     answer: String(a + b),
 *     shuffle: true,
 *   }),
 * })
 */
export function defineSkill<
  const Id extends string,
  P extends Params,
  S extends StepSchema,
  const T extends string = never,
>(
  id: Id,
  skill: {
    step: StepComponent<S>
    tags?: readonly T[]
    prerequisites?: () => readonly AnySkill[]
    generate: (random: Random) => P
    render: (params: P) => InferShape<S['data'], 'input'>
  },
): Skill<Id, InferShape<S['data'], 'input'>, T> {
  // The parameters' type only matters between generate and render, which it has been checked for.
  return { id, ...skill } as unknown as Skill<Id, InferShape<S['data'], 'input'>, T>
}

/**
 * A bank of questions, drawn from the given skills, not from their prerequisites.
 * Its `Practice` is an endless series of questions, each from a skill drawn at random,
 * restricted to some skills or tags if given.
 *
 * @example
 * export const bank = createQuestionBank(addition, multiplication)
 *
 * // In a page:
 * <bank.Practice id="entrainement" />
 * <bank.Practice id="additions" skills={['arithmetic/addition']} />
 */
export function createQuestionBank<const S extends readonly AnySkill[]>(...skills: S) {
  return bank<S[number]>(skills)
}

/**
 * Checks the skills reachable through prerequisites: their ids are unique, and they form no cycle.
 */
function prerequisiteGraph(skills: readonly AnySkill[]) {
  const byId = new Map<string, AnySkill>()
  const register = (skill: AnySkill) => {
    const known = byId.get(skill.id)
    if (known && known !== skill) throw new Error(`The skill id "${skill.id}" is defined twice`)
    byId.set(skill.id, skill)
  }
  for (const skill of skills) {
    if (byId.has(skill.id)) throw new Error(`The skill id "${skill.id}" is defined twice`)
    register(skill)
  }

  const graph = new Map<string, readonly AnySkill[]>()
  const visit = (skill: AnySkill, path: string[]) => {
    if (path.includes(skill.id)) {
      throw new Error(`The prerequisites form a cycle: ${[...path, skill.id].join(' → ')}`)
    }
    if (graph.has(skill.id)) return
    const prerequisites = skill.prerequisites?.() ?? []
    for (const prerequisite of prerequisites) {
      register(prerequisite)
      visit(prerequisite, [...path, skill.id])
    }
    graph.set(skill.id, prerequisites)
  }
  for (const skill of skills) visit(skill, [])
  return graph
}

function bank<S extends AnySkill>(list: readonly S[]) {
  type Id = S['id']
  type Tag = S extends Skill<any, any, infer T> ? T : never
  type Rendered = S extends Skill<any, infer D, any> ? D : never
  // `kind` is the name saved answers already use for the skill's id.
  type Data = { kind: Id; params: Params }
  type Filter = { skills?: readonly Id[]; tags?: readonly Tag[] }

  if (list.length === 0) throw new Error('A question bank needs at least one skill')
  const graph = prerequisiteGraph(list)
  const byId = Object.fromEntries(list.map((s) => [s.id, s])) as unknown as Record<
    Id,
    Skill<Id, Rendered, Tag>
  >
  const skills = list.map((s) => s.id) as [Id, ...Id[]]
  const Data = v.object({ kind: v.picklist(skills), params: Params })

  function available(filter: Filter = {}) {
    return skills.filter(
      (id) =>
        (!filter.skills || filter.skills.includes(id)) &&
        (!filter.tags || byId[id].tags?.some((tag) => filter.tags!.includes(tag))),
    )
  }

  function generate(filter: Filter = {}, seed?: string | number): Data {
    const random = createRandom(seed)
    const id = random.sample(available(filter))
    return { kind: id, params: byId[id].generate(random) }
  }

  const render = (data: Data): Rendered => byId[data.kind].render(data.params)

  // The skill is saved with the parameters, so that a saved question is restored with its own step.
  const steps = Object.fromEntries(
    skills.map((id) => [
      id,
      createDerivedStep(
        byId[id].step,
        { kind: v.literal(id), params: Params },
        ({ params }) => byId[id].render(params) as any,
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
   * An endless series of questions from the bank, restricted to some skills or tags if given.
   * Resubmissions are off by default, as a new question follows each answer.
   *
   * @example
   * <bank.Practice id="entrainement" tags={['s1']} />
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

  /** Direct prerequisites only; they need not be in any bank. */
  const prerequisitesOf = (id: Id | (string & {})): readonly AnySkill[] => {
    const prerequisites = graph.get(id)
    if (!prerequisites) throw new Error(`The skill "${id}" is not known to this bank`)
    return prerequisites
  }

  return { Practice, generate, render, skills, available, steps, prerequisitesOf }
}
