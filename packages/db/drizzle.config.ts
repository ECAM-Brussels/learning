import { defineConfig } from 'drizzle-kit'
import { env } from 'virtual:env/server'

export default defineConfig({
  out: './drizzle',
  schema: './schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
