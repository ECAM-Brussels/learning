import { Meta } from '@learning/components'
import { getUser, hasPermissions } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import Page from './03-diff.content.mdx'

export const route = {
  preload() {
    getUser()
    hasPermissions(['draft:read'])
  },
} satisfies RouteDefinition

export default function Diff() {
  return (
    <Meta
      title="Séance 3: Différences"
      authorized={() => {
        if (new Date() > new Date('2026-10-16 07:00')) return true
        return hasPermissions(['draft:read'])
      }}
    >
      <Page />
    </Meta>
  )
}
