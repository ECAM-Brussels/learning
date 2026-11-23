import Page from './05-optimisation.content.mdx'
import { SessionPage, sessionRoute } from './sessions.meta'

export const route = sessionRoute('05-optimisation')

export default () => (
  <SessionPage link="05-optimisation">
    <Page />
  </SessionPage>
)
