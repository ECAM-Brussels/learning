import { Meta } from '@learning/components'
import { getUser, hasPermissions } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import Page from './02-plots.content.mdx'

export const route = {
  preload() {
    getUser()
    hasPermissions(['draft:read'])
  },
} satisfies RouteDefinition

export default () => {
  return (
    <Meta
      title="Séance 2: Fonctions et graphiques"
      authorized={() => hasPermissions(['draft:read'])}
    >
      <Page />
    </Meta>
  )
}
