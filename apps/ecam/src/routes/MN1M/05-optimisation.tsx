import Page from './05-optimisation.content.mdx'
import { SessionPage, sessionRoute } from './sessions.meta'

export const route = sessionRoute

export default () => (
  <SessionPage link="05-optimisation">
    <Page />
  </SessionPage>
)
