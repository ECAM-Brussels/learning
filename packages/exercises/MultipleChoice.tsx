import { Attempt } from '@learning/components'
import { createStep, omitFromJSON } from '@learning/core'
import type { JSX } from '@solidjs/web/jsx-runtime'
import { For, type ComponentProps } from 'solid-js'
import * as v from 'valibot'

function convertToSet<const T extends string>(selection: T[]) {
  const selectionSet = new Set(selection)
  return {
    ...selectionSet,
    equals: (other: T[]) => {
      const otherSet = new Set(other)
      return selectionSet.symmetricDifference(otherSet).size === 0
    },
  }
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

const _MultipleChoice = createStep({
  schema: {
    data: {
      prompt: omitFromJSON(v.custom<JSX.Element>(() => true)),
      options: omitFromJSON(Options(v.string())),
      grade: omitFromJSON(v.custom<(sel: SpecialSet<string>) => boolean>(() => true)),
    },
    inputs: { selection: v.array(v.string()) },
  },
  grade(ctx) {
    return ctx.data.grade(convertToSet(ctx.inputs.selection))
  },
  prompt: (ctx) => {
    return (
      <>
        {ctx.data.prompt}
        <div class="flex gap-4">
          <Attempt>
            <For each={Array.from(ctx.data.options.entries())}>
              {([name, element]) => (
                <label class="rounded-md border border-blue-100 bg-blue-50 p-2">
                  <input
                    type="checkbox"
                    class="mr-2"
                    checked={ctx.state.current.selection?.includes(name)}
                    onChange={(event) =>
                      ctx.state.set('selection', (prev) => {
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

export function MultipleChoice<const K extends string>(
  props: Omit<ComponentProps<typeof _MultipleChoice>, 'prompt' | 'options' | 'grade'> & {
    prompt: JSX.Element
    options: Options<K>
    grade: (sel: SpecialSet<K>) => boolean
  },
) {
  return <_MultipleChoice {...(props as unknown as ComponentProps<typeof _MultipleChoice>)} />
}
