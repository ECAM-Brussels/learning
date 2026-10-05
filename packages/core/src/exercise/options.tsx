import { createContext } from 'solid-js'
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
})
export type Options<T extends 'input' | 'output' = 'input'> = T extends 'input'
  ? v.InferInput<typeof Options>
  : v.InferOutput<typeof Options>

export const ExerciseOptionsContext = createContext<() => v.InferOutput<typeof Options>>(() =>
  v.parse(Options, {}),
)
