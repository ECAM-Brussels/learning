import { mock } from 'bun:test'

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
