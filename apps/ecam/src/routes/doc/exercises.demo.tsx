import { Sequence, tex } from '@learning/core'
import { Factor } from '@learning/exercises/math/algebra/Factor'
import { Simple } from '@learning/exercises/math/Simple'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'

export const Factorisation = () => (
  <Sequence id="demo-factorisation">
    <Factor expr="x^2 - 5x + 6" />
    <Factor expr="x^2 - 9" />
    <Factor expr="2x^2 + 4x + 2" />
  </Sequence>
)

export const ChoixMultiple = () => (
  <MultipleChoice
    id="demo-choix-multiple"
    prompt={<p>Quelle fonction est égale à sa dérivée ?</p>}
    choices={{ A: tex`x^2`, B: tex`e^x`, C: tex`\ln x`, D: tex`\sin x` }}
    answer="B"
    shuffle
  />
)

export const ReponseLibre = () => (
  <Simple
    id="demo-reponse-libre"
    prompt={<p>Que vaut {tex`\displaystyle \int_0^1 x^2 \, \mathrm{d}x`} ?</p>}
    label="\int_0^1 x^2 \, \mathrm{d}x ="
    grade={(attempt) => attempt.isEqual('\\frac{1}{3}')}
  />
)
