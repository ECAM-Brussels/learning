import CheckMark from '@learning/components/CheckMark'
import { createView, defineFeedback, defineSchema, expr, fields } from '@learning/core'
import type { ComponentProps } from 'solid-js'
import * as v from 'valibot'

export const schema = defineSchema({
  name: 'math/simple',
  question: {
    params: v.optional(v.record(v.string(), v.any())),
    grade: v.custom<(e: NonNullable<ReturnType<typeof expr>>, params: object) => Promise<boolean>>(
      () => true,
    ),
  },
  steps: {
    start: {
      state: {
        attempt: fields.Math('Tentative'),
      },
    },
  },
})

const feedback = defineFeedback<typeof schema>({
  start: async ({ question: { grade, params }, state: { attempt } }) => {
    const correct = await grade(attempt, params ?? {})
    return { correct, score: [Number(correct), 1] as const, next: null }
  },
})

const _Simple = createView(schema, feedback, {
  start: (props, { Field }) => {
    return (
      <>
        <Field name="state.attempt" />
        <CheckMark value={props.correct} />
      </>
    )
  },
})

/**
 * Exercise that checks symbolic equality
 *
 * The only require prop is `grade`,
 * which is a function that takes an attempt and returns
 * whether it's correct or not.
 *
 * If it is important
 * that the answer not be leaked to the client,
 * use the `use server` directive.
 *
 * @example
 * <p>Give the area of a circle of radius 1.</p>
 * <Simple grade={(attempt) => attempt.isEqual(`\pi`)} />
 */
const Simple = <D extends Record<string, any>>(
  props: Omit<ComponentProps<typeof _Simple>, 'params' | 'grade'> & {
    params?: D
    grade?: (attempt: NonNullable<ReturnType<typeof expr>>, params: D) => Promise<boolean>
  },
) => _Simple(props as any)

export default Simple
