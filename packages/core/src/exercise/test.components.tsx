import { mock } from 'bun:test'

/** The components exercises use, without the editors and renderers that need a real browser. */
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
