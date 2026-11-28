import { Attempt } from '@learning/components'
import { createRandom, createStep, omitFromJSON, StepContext } from '@learning/core'
import type { JSX } from '@solidjs/web/jsx-runtime'
import { createMemo, For, useContext, type ComponentProps } from 'solid-js'
import * as v from 'valibot'

function convertToSet<const T extends string>(selection: T[]) {
  const selectionSet = new Set(selection)
  return Object.assign(selectionSet, {
    equals: (other: T[]) => selectionSet.symmetricDifference(new Set(other)).size === 0,
  })
}
type SpecialSet<T extends string> = ReturnType<typeof convertToSet<T>>

function Options<T extends v.BaseSchema<any, any, any>>(schema: T) {
  return v.union([
    v.map(
      schema,
      v.custom<JSX.Element>(() => true),
    ),
    v.pipe(
      v.record(
        schema,
        v.custom<JSX.Element>(() => true),
      ),
      v.transform((record) => new Map(Object.entries(record))),
    ),
  ])
}

type Options<K extends string> = { [P in K]: JSX.Element }

const common = {
  prompt: omitFromJSON(v.custom<JSX.Element>(() => true)),
  choices: omitFromJSON(Options(v.string())),
  shuffle: v.optional(v.boolean(), false),
}

const _MultipleChoice = createStep({
  schema: {
    data: [
      // Each member also lists the other's key as `undefined`, so that both keys are common to the union
      // and TypeScript can still type a `grade` callback inside `createDerivedStep`.
      {
        ...common,
        answer: v.union([v.string(), v.array(v.string())]),
        grade: v.optional(v.undefined()),
      },
      {
        ...common,
        answer: v.optional(v.undefined()),
        grade: omitFromJSON(v.custom<(sel: SpecialSet<string>) => boolean>(() => true)),
      },
    ],
    inputs: { selection: v.array(v.string()) },
  },
  grade(ctx) {
    const selection = convertToSet(ctx.inputs.selection)
    const { answer, grade } = ctx.data
    return grade ? grade(selection) : selection.equals([answer ?? []].flat())
  },
  prompt: (ctx) => {
    const step = useContext(StepContext)
    const single = () => typeof ctx.data.answer === 'string'
    const group = () => {
      const s = step?.()
      return `multiple-choice:${s?.url}:${s?.sequenceId}:${s?.sequencePosition}:${s?.position}`
    }
    const entries = createMemo(() => {
      const entries = Array.from(ctx.data.choices.entries())
      if (!ctx.data.shuffle) return entries
      // Seeded so that the order survives reloads and matches the read-only copy in the feedback.
      const seed = `${step?.().sequenceId}:${step?.().sequencePosition}:${entries.map(([k]) => k)}`
      return createRandom(seed).shuffle(entries)
    })
    return (
      <>
        {ctx.data.prompt}
        <div class="my-4 flex flex-wrap gap-4">
          <Attempt>
            <For each={entries()}>
              {([name, element]) => (
                <label class="rounded-md border border-slate-100 p-2 px-4 text-slate-800 shadow-sm hover:bg-slate-50 has-checked:border-blue-200 has-checked:bg-blue-50 has-checked:text-sky-700">
                  <input
                    type={single() ? 'radio' : 'checkbox'}
                    name={single() ? group() : undefined}
                    class="mr-2"
                    disabled={ctx.state.correct !== undefined}
                    checked={ctx.state.current.selection?.includes(name)}
                    onChange={(event) =>
                      ctx.state.set('selection', (prev) => {
                        if (single()) return [name]
                        const previous = new Set(prev ?? [])
                        if (event.currentTarget.checked) {
                          previous.add(name)
                        } else {
                          previous.delete(name)
                        }
                        return Array.from(previous)
                      })
                    }
                  />
                  {element}
                </label>
              )}
            </For>
          </Attempt>
        </div>
      </>
    )
  },
})

type MultipleChoiceProps<K extends string> = Omit<
  ComponentProps<typeof _MultipleChoice>,
  'prompt' | 'choices' | 'answer' | 'grade' | 'shuffle'
> & {
  /** The statement. */
  prompt: JSX.Element
  /** The choices, each named by a key, and shown as text or JSX, such as `{ A: 'Oui', B: 'Non' }`. */
  choices: Options<K>
  /** Whether to mix the choices, in the same order on every visit. */
  shuffle?: boolean
} & (
    | {
        /** The key of the right choice, or the keys of all right choices. */
        answer: K | K[]
        grade?: undefined
      }
    | {
        answer?: undefined
        /** Whether the selection, a set of keys with `equals`, is right, for a correction `answer` can't express. */
        grade: (sel: SpecialSet<K>) => boolean
      }
  )

interface MultipleChoiceComponent extends Pick<typeof _MultipleChoice, 'config'> {
  <K extends string>(props: MultipleChoiceProps<K>): JSX.Element
  (props: ComponentProps<typeof _MultipleChoice>): JSX.Element
}

/**
 * A multiple choice question.
 * `choices` names each choice with a key, and `answer` gives the right key:
 * a single key shows radio buttons, a list shows checkboxes, all of which must be ticked.
 * `shuffle` mixes the choices, in the same order on every visit.
 * Prefer `answer` over `grade`: tests can check the answer without rendering.
 *
 * @example
 * <MultipleChoice
 *   id="derivee"
 *   prompt={<p>Quelle fonction est égale à sa dérivée ?</p>}
 *   choices={{ A: tex`x^2`, B: tex`e^x`, C: tex`\ln x` }}
 *   answer="B"
 *   shuffle
 * />
 * // Several right choices, as checkboxes:
 * <MultipleChoice id="paires" prompt={<p>Lesquelles sont paires ?</p>}
 *   choices={{ a: tex`x^2`, b: tex`x^3`, c: tex`\cos x` }} answer={['a', 'c']} />
 */
export const MultipleChoice = _MultipleChoice as unknown as MultipleChoiceComponent
