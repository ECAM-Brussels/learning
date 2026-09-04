import { query } from '@solidjs/router'
import { getRequestEvent, respond } from '@solidjs/web'
import { env } from 'virtual:env/server'

const permissions = {
  exercise: ['readOwn', 'read', 'answerOwn', 'delete', 'deleteOwn'],
  draft: ['read'],
} as const satisfies Record<string, readonly string[]>

const roles = {
  guest: {
    exercise: ['readOwn', 'answerOwn', 'deleteOwn'],
    draft: [],
  },
  student: {
    exercise: ['readOwn', 'answerOwn', 'deleteOwn'],
    draft: [],
  },
  teacher: {
    exercise: ['readOwn', 'read', 'answerOwn', 'deleteOwn'],
    draft: ['read'],
  },
  admin: permissions,
} as const satisfies Record<string, Role>

type Scope = keyof typeof permissions
type Role = { [K in Scope]?: readonly (typeof permissions)[K][number][] }
type Permission<S extends Scope = Scope> = `${S}:${(typeof permissions)[S][number]}`

export const getRole = query(async () => {
  'use server'
  const user = getRequestEvent()?.locals?.user
  if (!user) return 'guest'
  let role: keyof typeof roles = 'student'
  if (env.ADMINS.includes(user.email)) role = 'admin'
  else if (/^[a-zA-Z]$/.test(user.email) && user.email.endsWith('@ecam.be')) role = 'teacher'
  return role
}, 'getRole')

export const hasPermissions = query(async <P extends Permission[]>(permissions: P) => {
  'use server'
  const role = await getRole()
  if (!role) return false
  return permissions.every(<S extends Scope>(p: Permission<S>) => {
    const [scope, action] = p.split(':') as [S, string]
    return [...roles[role][scope]].includes(action as any)
  })
}, 'hasPermissions')

export async function ensurePermissions<P extends Permission[]>(permissions: P): Promise<void> {
  if (!(await hasPermissions(permissions)))
    throw respond({ error: 'Permissions manquantes' }, { status: 403 })
}
