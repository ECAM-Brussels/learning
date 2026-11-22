import Page from './03-diff.content.mdx'
import { SessionPage, sessionRoute } from './sessions.meta'

export const route = sessionRoute

export default () => (
  <SessionPage link="03-diff">
    <Page />
  </SessionPage>
)
