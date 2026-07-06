import { db, Step, tables } from '@learning/db'
import * as v from 'valibot'

export async function fetchExercise(rawKey: Step.ExerciseKey) {
  'use server'
  const steps = await db.query.steps.findMany({
    where: v.parse(Step.ExerciseKey, rawKey),
    orderBy: { position: 'asc' },
  })
  return steps
}

export async function saveStep(...args: [Step.Primary, Step.Payload]) {
  'use server'
  const [key, step] = v.parse(v.tuple([Step.Primary, Step.Payload]), args)
  await db.insert(tables.steps).values({ ...key, ...step })
}
