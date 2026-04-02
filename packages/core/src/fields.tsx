import * as v from 'valibot'
import { defineField } from './exercise/base'
import { expr } from './expr'

export const Math = defineField({
  base: v.pipe(
    v.string(),
    v.nonEmpty(),
    v.check((v) => {
      try {
        expr(v)
        return true
      } catch (error) {
        return false
      }
    }, 'Expression mathématique invalide'),
  ),
  feedback: v.pipe(v.string(), v.transform(expr)),
})
