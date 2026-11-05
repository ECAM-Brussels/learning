import { authClient } from '@learning/auth/client'
import { formAction, query } from '@solidjs/router'
import { getRequestEvent, redirect } from '@solidjs/web'

export const getUser = query(async () => {
  'use server'
  return getRequestEvent()!.locals.user
}, 'getUser')

export const login = authClient.signIn.social

export const logout = formAction(async () => {
  await authClient.signOut()
  throw redirect('/')
})
