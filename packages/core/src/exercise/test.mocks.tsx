import { mock } from 'bun:test'

/**
 * Module mocks shared by the exercise tests.
 *
 * Bun runs all test files in one process and module mocks are global,
 * so they are registered once, here, rather than in each test file.
 * Import this module before importing the modules under test.
 *
 * - No user is logged in, so steps use the real localStorage-backed context.
 * - The remote context and auth/permission helpers pull in server-only modules.
 * - `@learning/components` is reduced to the pieces exercises render.
 */
export const hasPermissions = mock(async (_: string[]) => true)
mock.module('../auth', () => ({ getUser: async () => null }))
mock.module('./context.remote', () => ({
  default: {},
  fetchSequence: async () => null,
  getProgress: async () => null,
}))
mock.module('../permissions', () => ({ hasPermissions }))
mock.module('@learning/components', async () => {
  const { Boundary } = await import('../../../components/src/Boundary')
  const { Form } = await import('../../../components/src/Form')
  const { FeedbackContext } = await import('../../../components/src/FeedbackContext')
  const { Pagination } = await import('../../../components/src/Pagination')
  const { Scope } = await import('../../../components/src/Scope')
  return {
    Boundary,
    Form,
    FeedbackContext,
    Pagination,
    Scope,
    MathField: (props: any) => <input data-testid="math-field" {...props} />,
    Youtube: (props: { src: string }) => <div data-testid="video" data-src={props.src} />,
  }
})
