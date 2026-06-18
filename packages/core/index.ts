export * from './src/chemistry'
export { Encrypted, decrypt, encrypt } from './src/crypto'
export { ExerciseContext, Step, createStepComponent } from './src/exercise/base'
export { Sequence } from './src/exercise/sequence'
export { Expression, expr, type Quantity } from './src/expr'
export * from './src/py'
export { default as symapi } from './src/symapi'
export * from './src/tex'

/**
 * Macro that marks a build time substitution.
 *
 * The supplied function is replaced by its awaited return value at build time.
 *
 * @example
 * const test = $(() => 3 + 4)
 * // becomes `const test = 7`
 */
export function $<T>(_fn: () => T): Awaited<T> {
  throw new Error('This function is a marker and should not be called at runtime')
}
