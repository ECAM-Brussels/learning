import Page from './03-diff.content.mdx'
import { SessionPage, sessionRoute } from './sessions.meta'

export const route = sessionRoute('03-diff')

export default () => (
  <SessionPage link="03-diff">
    <Page />
  </SessionPage>
)
