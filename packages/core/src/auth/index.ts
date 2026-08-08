import { query } from '@solidjs/router'

export const getUser = query(async (): Promise<{ email: string } | null> => {
  'use server'
  return { email: 'ngy@ecam.be' }
}, 'getUser')
