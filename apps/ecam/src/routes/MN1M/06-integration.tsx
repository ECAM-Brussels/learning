import Page from './06-integration.content.mdx'
import { SessionPage, sessionRoute } from './sessions.meta'

export const route = sessionRoute

export default () => (
  <SessionPage link="06-integration">
    <Page />
  </SessionPage>
)
