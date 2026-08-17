import { db, schema } from '@learning/db'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { env } from 'virtual:env/server'

const createAuth = () =>
  betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: schema,
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      microsoft: {
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  })

let authSingleton: ReturnType<typeof createAuth> | undefined

export const getAuth = () => (authSingleton ??= createAuth())

export type auth = ReturnType<typeof getAuth>
