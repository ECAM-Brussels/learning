import { expr } from '@learning/core'
import { CompleteSquare } from '@learning/exercises/math/algebra/CompleteSquare'
import { sample } from 'es-toolkit'

function wrongAbs(x: Parameters<typeof expr>[0]) {
  expr(x)
}

function Test() {
  return (
    <>
      <h1>Test carré parfait</h1>

      <CompleteSquare
        id="test1"
        data={() => ({
          expr: expr('(x-b)^2 + c').subs({
            b: sample([-3, -2, -1, 2, 3]),
            c: sample([-3, -2, -1, 2, 3]),
          }),
        })}
      />
      <CompleteSquare
        id="test2"
        expr={expr('x^2 + bx + c').subs({
          b: sample([-8, -6, -4, -2, 2, 4, 6, 8]),
          c: sample([-9, -8, -7, -6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6, 7, 8, 9]),
        })}
      />
    </>
  )
}

export default Test
