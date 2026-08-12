import { authClient } from '@learning/auth/client'
import { action, query } from '@solidjs/router'

export const getUser = query(async () => {
  const { data: session, error } = await authClient.getSession()
  if (error || !session) return null
  return session.user
}, 'getUser')

export const login = authClient.signIn.social

export const logout = action(async () => {
  await authClient.signOut()
})
