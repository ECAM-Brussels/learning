import { Meta } from '@learning/components'
import { getUser, hasPermissions } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import Page from './01-python.content.mdx'

export const route = {
  preload() {
    getUser()
    hasPermissions(['draft:read'])
  },
} satisfies RouteDefinition

export default () => {
  return (
    <Meta title="Séance 1: Introduction à Python" authorized={() => hasPermissions(['draft:read'])}>
      <Page />
    </Meta>
  )
}
