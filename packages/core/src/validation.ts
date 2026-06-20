import * as v from 'valibot'

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
