import { Meta } from '@learning/components'
import { getUser, hasPermissions } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import Page from './05-optimisation.content.mdx'

export const route = {
  preload() {
    getUser()
    hasPermissions(['draft:read'])
  },
} satisfies RouteDefinition

export default function Diff() {
  return (
    <Meta
      title="Séance 5: Optimisation"
      authorized={() => {
        if (new Date() > new Date('2026-11-16 07:00')) return true
        return hasPermissions(['draft:read'])
      }}
    >
      <Page />
    </Meta>
  )
}
