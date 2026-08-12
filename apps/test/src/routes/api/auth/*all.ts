import { auth } from '@learning/auth'
import { toSolidStartHandler } from 'better-auth/solid-start'

export const { GET, POST } = toSolidStartHandler(auth)
