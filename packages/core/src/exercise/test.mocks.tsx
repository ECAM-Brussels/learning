import { mock } from 'bun:test'
import './test.components'

export const hasPermissions = mock(async (_: string[]) => true)
mock.module('../auth', () => ({ getUser: async () => null }))
mock.module('./context.remote', () => ({
  default: {},
  fetchSequence: async () => null,
  getProgress: async () => null,
  getStats: async () => [],
}))
mock.module('../permissions', () => ({ hasPermissions, getRole: async () => 'guest' }))
mock.module('../annotations.remote', () => ({ annotations: {} }))
