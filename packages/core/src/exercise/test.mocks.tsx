import { mock } from 'bun:test'

export const hasPermissions = mock(async (_: string[]) => true)
mock.module('../auth', () => ({ getUser: async () => null }))
mock.module('./context.remote', () => ({
  default: {},
  fetchSequence: async () => null,
  getProgress: async () => null,
  getStats: async () => [],
}))
mock.module('../permissions', () => ({ hasPermissions, getRole: async () => 'guest' }))
mock.module('../annotations.remote', () => ({ annotations: {} }))
mock.module('@learning/components', async () => {
  const { Boundary } = await import('../../../components/src/Boundary')
  const { Form } = await import('../../../components/src/Form')
  const { FeedbackContext } = await import('../../../components/src/FeedbackContext')
  const { Pagination } = await import('../../../components/src/Pagination')
  const { Scope } = await import('../../../components/src/Scope')
  const { Attempt } = await import('../../../components/src/Attempt')
  const { Modal } = await import('../../../components/src/Modal')
  const { Table } = await import('../../../components/src/Table')
  return {
    Attempt,
    Boundary,
    Form,
    FeedbackContext,
    Pagination,
    Modal,
    Scope,
    Table,
    MathField: (props: any) => <input data-testid="math-field" {...props} />,
    Youtube: (props: { src: string }) => <div data-testid="video" data-src={props.src} />,
    Highlight: (props: { code: string }) => <pre>{props.code}</pre>,
    Latex: (props: { tex: string }) => <span>{props.tex}</span>,
    Python: () => null,
  }
})
