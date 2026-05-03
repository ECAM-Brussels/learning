export {
  createView,
  defineFeedback,
  defineField,
  defineSchema,
  Exercise,
  ExerciseContext,
  type Feedback,
  type View,
} from './src/exercise/base'
export { ExerciseSequence } from './src/exercise/sequence'
export { expr, Expression } from './src/expr'
export { Math, Text } from './src/fields'
import { expr } from './src/expr'

/**
 * Macro that marks a build time substitution.
 *
 * The supplied function is replaced by its awaited return value at build time.
 *
 * @example
 * const test = $(() => 3 + 4)
 * // becomes `const test = 7`
 */
export function $<T>(_fn: (ctx: { expr: typeof expr }) => T): Awaited<T> {
  throw new Error('This function is a marker and should not be called at runtime')
}
