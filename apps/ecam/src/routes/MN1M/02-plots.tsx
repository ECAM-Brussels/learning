import Page from './02-plots.content.mdx'
import { SessionPage, sessionRoute } from './sessions.meta'

export const route = sessionRoute

export default () => (
  <SessionPage link="02-plots">
    <Page />
  </SessionPage>
)
