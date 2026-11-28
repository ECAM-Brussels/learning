import * as v from 'valibot'

/**
 * Marks data that must not be saved with the answers, such as JSX or a function:
 * it is used to show and correct the question, but left out of what is saved.
 * Use it for what the code can give again, never for what reproduces the question.
 *
 * @example
 * schema: {
 *   data: { prompt: omitFromJSON(v.custom<JSX.Element>(() => true)), n: 'number' },
 *   inputs: { attempt: 'expr' },
 * }
 */
export function omitFromJSON<T extends v.BaseSchema<any, any, any>>(schema: T) {
  return v.pipe(
    schema,
    v.transform(<R>(value: R): R => {
      if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
        return value
      }
      try {
        Object.defineProperty(value, 'toJSON', {
          value: () => undefined,
          configurable: true,
          enumerable: false,
        })
      } catch {}
      return value
    }),
  )
}
