import { buildSchemas } from '@learning/core'
import { toJsonSchema } from '@valibot/to-json-schema'
import * as v from 'valibot'
import * as MathFactor from './math/factor/index'

const registry = [buildSchemas(MathFactor.schema, MathFactor.feedback)] as const

export const schema = v.variant(
  'name',
  registry.map((r) => r.Teacher),
)

const jsonSchema = toJsonSchema(schema, { typeMode: 'input', errorMode: 'ignore' })

console.log(JSON.stringify(jsonSchema, null, 2))
