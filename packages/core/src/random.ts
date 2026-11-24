/**
 * A seeded random number generator (mulberry32).
 *
 * Unlike `Math.random` and es-toolkit, the same seed always gives the same sequence,
 * which lets saved exercises be rebuilt identically and generated questions be reproduced in tests.
 */
export function createRandom(seed: string | number = Math.random()) {
  let state = typeof seed === 'string' ? hash(seed) : Math.floor(seed * 2 ** 32) >>> 0
  function float() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
  /** Like es-toolkit's `randomInt`, `max` is exclusive. */
  const int = (min: number, max: number) => min + Math.floor(float() * (max - min))
  const sample = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('Cannot sample from an empty array')
    return items[int(0, items.length)]!
  }
  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
      const j = int(0, i + 1)
      ;[result[i], result[j]] = [result[j]!, result[i]!]
    }
    return result
  }
  return { float, int, sample, shuffle }
}

export type Random = ReturnType<typeof createRandom>

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}
