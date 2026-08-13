import { getAuth } from '@learning/auth'
import { toSolidStartHandler } from 'better-auth/solid-start'

export const { GET, POST } = toSolidStartHandler(() => getAuth())
