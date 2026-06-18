import { Page } from '@learning/components'
import { tex } from '@learning/core'
import { PythonExercise } from '@learning/exercises/python/code'
import { Documentation } from './Documentation'

export default () => (
  <Page title="Tests">
    <PythonExercise
      prompt={
        <p>
          Écrivez une fonction {tex`f`} qui prend un entier {tex`n`} et retourne {tex`n^2`}
        </p>
      }
      tests={[1, 2, 3, 4].map((n) => ({ test: `f(${n})`, expected: `${n ** 2}` }))}
    />
    <Documentation />
  </Page>
)
