import { Deck } from '@learning/components'
import { tex } from '@learning/core'

export function Demo() {
  return (
    <Deck>
      <Deck.Title
        title="Les dérivées"
        subtitle="Analyse 1"
        author="Prénom Nom"
        institute="ECAM Brussels Engineering School"
        date="Novembre 2026"
      />
      <Deck.Section title="Définition" />
      <Deck.Slide title="Taux d'accroissement">
        <p>
          La dérivée de <Deck.Alert>f</Deck.Alert> en {tex`a`} est la limite
        </p>
        <p class="text-center">{tex.display`f'(a) = \lim_{h \to 0} \frac{f(a + h) - f(a)}{h}`}</p>
        <p>si cette limite existe :</p>
        <ul>
          <Deck.Fragment as="li">elle mesure la pente de la tangente ;</Deck.Fragment>
          <Deck.Fragment as="li">elle mesure une vitesse instantanée.</Deck.Fragment>
        </ul>
        <Deck.Notes>Rappeler la définition de la tangente avant de passer à la suite.</Deck.Notes>
      </Deck.Slide>
      <Deck.Slide title="Deux colonnes" class="grid grid-cols-2 content-center">
        <div>
          <h3 class="text-(--m-accent)">Dérivable</h3>
          <p>
            {tex`x^2`}, {tex`\sin x`}, {tex`e^x`}
          </p>
        </div>
        <div>
          <h3 class="text-(--m-accent)">Non dérivable en 0</h3>
          <p>
            {tex`|x|`}, {tex`\sqrt[3] x`}
          </p>
        </div>
      </Deck.Slide>
      <Deck.Stack>
        <Deck.Slide title="Exemple">
          Calculons la dérivée de {tex`x^2`} en {tex`a`}.
        </Deck.Slide>
        <Deck.Slide title="Exemple (suite)">
          {tex.display`\frac{(a + h)^2 - a^2}{h} = 2a + h \to 2a`}
        </Deck.Slide>
      </Deck.Stack>
      <Deck.Standout>Des questions ?</Deck.Standout>
    </Deck>
  )
}
