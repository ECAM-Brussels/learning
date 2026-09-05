import { authClient } from '@learning/auth/client'
import { action, query } from '@solidjs/router'
import { getRequestEvent, redirect } from '@solidjs/web'

export const getUser = query(async () => {
  'use server'
  return getRequestEvent()!.locals.user
}, 'getUser')

export const login = authClient.signIn.social

export const logout = action(async () => {
  await authClient.signOut()
  throw redirect('/')
})
