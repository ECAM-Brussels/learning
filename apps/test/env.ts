import * as v from 'valibot'

export default {
  server: {
    SYMAPI_URL: v.pipe(v.string(), v.url()),
    DATABASE_URL: v.pipe(v.string(), v.url()),
    BETTER_AUTH_URL: v.pipe(v.string(), v.url()),
    BETTER_AUTH_SECRET: v.pipe(v.string(), v.nonEmpty()),
    MICROSOFT_CLIENT_ID: v.pipe(v.string(), v.nonEmpty()),
    MICROSOFT_CLIENT_SECRET: v.pipe(v.string(), v.nonEmpty()),
    MICROSOFT_TENANT_ID: v.pipe(v.string(), v.nonEmpty()),
  },
}
