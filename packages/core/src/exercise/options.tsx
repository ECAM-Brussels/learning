import type { JSX } from '@solidjs/web'
import { createContext, omit, useContext } from 'solid-js'
import * as v from 'valibot'

const DateSchema = v.union([
  v.date(),
  v.pipe(
    v.string(),
    v.transform((date) => new Date(date)),
  ),
])

export const Options = v.object({
  showFeedback: v.optional(
    v.union([
      v.boolean(),
      v.pipe(
        DateSchema,
        v.transform((date) => new Date() >= date),
      ),
    ]),
    true,
  ),
  allowResets: v.optional(v.boolean(), true),
  allowResubmissions: v.optional(v.boolean(), false),
  depth: v.optional(v.number(), 0),
  readOnly: v.optional(
    v.union([
      v.boolean(),
      v.pipe(
        DateSchema,
        v.transform((date) => new Date() >= date),
      ),
    ]),
    false,
  ),
  softDelete: v.optional(v.boolean(), false),
  video: v.optional(v.union([v.string(), v.null()])),
})
export type Options<T extends 'input' | 'output' = 'input'> = T extends 'input'
  ? v.InferInput<typeof Options>
  : v.InferOutput<typeof Options>

export const OptionsContext = createContext<() => Partial<Options>>(() => ({}))

export function ExerciseOptions(props: Partial<Options> & { children: JSX.Element }) {
  const parentOptions = useContext(OptionsContext)
  const options = omit(props, 'children')
  return (
    <OptionsContext value={() => ({ ...parentOptions(), ...options })}>
      {props.children}
    </OptionsContext>
  )
}
