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

/**
 * The options of an exercise, given with its `options` attribute or to every exercise inside `ExerciseOptions`.
 * Dates are `Date` objects or text such as `'2026-12-15'`, and take effect once they have passed.
 */
export const Options = v.object({
  /**
   * Whether the correction is shown after an answer, `true` by default.
   * A date hides it until then, as for an exam.
   *
   * @example
   * options={{ showFeedback: new Date('2026-12-15T18:00') }}
   */
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
  /**
   * Whether a student can start an answered exercise again, with its "Recommencer" button, `true` by default.
   */
  allowResets: v.optional(v.boolean(), true),
  /**
   * Whether a student can answer again after a wrong answer, `false` by default:
   * the new answer then replaces the wrong one, and the remediation it opened.
   */
  allowResubmissions: v.optional(v.boolean(), false),
  /**
   * How far the exercise is indented, as a step of a conversation: set by the platform, not by hand.
   */
  depth: v.optional(v.number(), 0),
  /**
   * Whether the exercise can't be answered any more, `false` by default.
   * A date closes it then, as for a deadline.
   *
   * @example
   * options={{ readOnly: '2026-12-15T18:00' }}
   */
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
  /**
   * Whether answers replaced by a new attempt are kept, marked deleted, rather than deleted, `false` by default:
   * to study how students got to their answer.
   */
  softDelete: v.optional(v.boolean(), false),
  /**
   * A YouTube video shown beside the exercise, such as an explanation, by its address.
   */
  video: v.optional(v.union([v.string(), v.null()])),
})
export type Options<T extends 'input' | 'output' = 'input'> = T extends 'input'
  ? v.InferInput<typeof Options>
  : v.InferOutput<typeof Options>

export const OptionsContext = createContext<() => Partial<Options>>(() => ({}))

/**
 * Gives options to every exercise inside it, such as the exercises of a test.
 * Options of an inner `ExerciseOptions`, then an exercise's own, take precedence.
 *
 * @example
 * <ExerciseOptions readOnly="2026-12-15T18:00" showFeedback="2026-12-15T18:00">
 *   <Factor id="test-1" expr="x^2 - 9" />
 *   <Factor id="test-2" expr="x^2 - 5x + 6" />
 * </ExerciseOptions>
 */
export function ExerciseOptions(props: Partial<Options> & { children: JSX.Element }) {
  const parentOptions = useContext(OptionsContext)
  const options = omit(props, 'children')
  return (
    <OptionsContext value={() => ({ ...parentOptions(), ...options })}>
      {props.children}
    </OptionsContext>
  )
}
