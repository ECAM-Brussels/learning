import { getRequestEvent } from '@solidjs/web'
import { env } from 'virtual:env/server'

const permissions = {
  exercise: ['readOwn', 'read', 'answerOwn', 'delete', 'deleteOwn'],
} as const satisfies Record<string, readonly string[]>

const roles = {
  student: {
    exercise: ['readOwn', 'answerOwn', 'deleteOwn'],
  },
  teacher: {
    exercise: ['readOwn', 'read', 'answerOwn', 'deleteOwn'],
  },
  admin: permissions,
} as const satisfies Record<string, Role>

type Scope = keyof typeof permissions
type Role = { [K in Scope]?: readonly (typeof permissions)[K][number][] }
type Permission<S extends Scope> = `${S}:${(typeof permissions)[S][number]}`

export function ensurePermissions<P extends Permission<Scope>[]>(permissions: P): void {
  const user = getRequestEvent()?.locals?.user
  if (!user) throw new Error('User not logged in')
  let role: keyof typeof roles = 'student'
  if (env.ADMINS.includes(user.email)) role = 'admin'
  else if (/^[a-zA-Z]$/.test(user.email)) role = 'teacher'
  const hasPermission = permissions.every(<S extends Scope>(p: Permission<S>) => {
    const [scope, action] = p.split(':')
    return roles[role][scope as S]?.includes(action as any)
  })
  if (!hasPermission) throw new Error('User does not have the required permissions')
}
