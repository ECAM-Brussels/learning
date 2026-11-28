import { describe, expect, test } from 'bun:test'
import { expr } from './expr'
import { latexOf } from './substitution'

describe('latexOf, what tex writes of a value', () => {
  test('a set, in French notation', async () => {
    expect(await latexOf(expr(']2, 5]', 'set'))).toBe(']2 ; 5]')
  })

  test('a promised value, once it arrives', async () => {
    expect(await latexOf(Promise.resolve(expr('[0, 1[', 'set')))).toBe('[0 ; 1[')
  })

  test('a vector, as a column', async () => {
    expect(await latexOf(expr(['1', '2'], 'vector'))).toBe('\\begin{bmatrix}1\\\\2\\end{bmatrix}')
  })

  test('an expression, as written', async () => {
    expect(await latexOf(expr('\\frac{1}{2}'))).toBe('\\frac{1}{2}')
  })
})
