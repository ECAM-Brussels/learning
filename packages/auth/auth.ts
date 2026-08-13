import { db, schema } from '@learning/db'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'

const createAuth = () =>
  betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: schema,
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID as string,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
        tenantId: process.env.MICROSOFT_TENANT_ID as string,
      },
    },
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    secret: process.env.BETTER_AUTH_SECRET,
  })

let authSingleton: ReturnType<typeof createAuth> | undefined

export const getAuth = () => (authSingleton ??= createAuth())

export type auth = ReturnType<typeof getAuth>
