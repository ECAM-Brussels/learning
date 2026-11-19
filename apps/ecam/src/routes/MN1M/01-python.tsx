import Page from './01-python.content.mdx'
import { SessionPage, sessionRoute } from './sessions.meta'

export const route = sessionRoute

export default () => (
  <SessionPage link="01-python">
    <Page />
  </SessionPage>
)
