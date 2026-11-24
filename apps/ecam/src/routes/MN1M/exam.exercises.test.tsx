import { describe, expect, test } from 'bun:test'

await import('../../../../../packages/core/src/exercise/test.mocks')

const { bank } = await import('./exam.exercises')

describe('MN1M question bank', () => {
  for (const kind of bank.skills) {
    test(`${kind}: the answer is always one of three or four choices`, () => {
      for (let seed = 0; seed < 300; seed++) {
        const data = bank.generate({ skills: [kind] }, seed)
        const { choices, answer } = bank.render(data)
        if (answer === undefined) throw new Error(`${kind} must declare its answer`)
        const keys = choices instanceof Map ? [...choices.keys()] : Object.keys(choices)
        expect({ data, keys }).toMatchObject({ keys: expect.arrayContaining([answer].flat()) })
        expect(keys.length).toBeWithin(3, 5)
        expect(keys.join('|')).not.toMatch(/NaN|undefined|Infinity/)
      }
    })
  }
})
