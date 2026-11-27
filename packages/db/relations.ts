import { defineRelations } from 'drizzle-orm'
import * as authSchema from './auth'
import * as tables from './schema'

export const schema = {
  ...tables,
  ...authSchema,
}

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session({ from: r.user.id, to: r.session.userId }),
    accounts: r.many.account({ from: r.user.id, to: r.account.userId }),
    steps: r.many.steps({ from: r.user.email, to: r.steps.userEmail }),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id }),
  },
  account: {
    user: r.one.user({ from: r.account.userId, to: r.user.id }),
  },
  steps: {
    user: r.one.user({ from: r.steps.userEmail, to: r.user.email }),
  },
}))
