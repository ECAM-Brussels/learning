import CheckMark from '@learning/components/CheckMark'
import { Example, Remark } from '@learning/components/Environment'
import { Heading } from '@learning/components/Heading'
import { hl } from '@learning/components/Highlight'
import { Page } from '@learning/components/Page'
import { expr, Sequence, substance, tex } from '@learning/core'
import Exercise from '@learning/exercises/math/Exercise'
import Factor from '@learning/exercises/math/factor'
import { sample } from 'es-toolkit'
import { createMemo, Show } from 'solid-js'
import './style.css'

export default () => (
  <Page title="Introduction à Learning">
    <p class="text-lg">
      Learning est un framework permettant de créer des applications d'apprentissage interactives.
      Dans cette page, nous vous présentons comment créer une simple séquence d'exercices corrigés
      symboliquement.
    </p>
    <Heading level={1}>Calcul formel</Heading>
    <Heading level={2}>Formules {tex`\LaTeX`} statiques</Heading>
    <p>
      Les formules mathématiques s'affichent via la commande <code>tex</code>, qui s'utilise comme
      suit:
    </p>
    <div class="grid grid-cols-2 items-center gap-12">
      {hl('jsx') /* jsx */ `{tex\`x^2 + y^2 = z^2\`}`}
      {tex /* tex */ `x^2 + y^2 = z^2`}
    </div>
    <p>
      Si vous souhaitez que la formule s'affiche de manière centrée sur une seule ligne (
      <em>mode display</em>), il suffit de faire en sorte que la formule comporte plus d'une ligne.
    </p>
    <div class="grid grid-cols-2 items-center gap-12">
      {hl('jsx') /* tsx */ `
        {tex\`
          x^2 + y^2 = z^2
        \`}
      `}
      {tex /* tex */ `
        x^2 + y^2 = z^2
      `}
    </div>
    <Heading level={2}>Manipulation d'expressions</Heading>
    <p>
      Le calcul formel est la partie essentielle qui permet la génération d'exercices qui{' '}
      <em>tombent juste</em> et la correction symbolique.
    </p>
    <p>
      Pour créer une expression mathématique manipulable, on utilise la fonction <code>expr</code>,
      qui prend en argument le code {tex`\LaTeX`} de l'expression.
    </p>
    {hl('tsx') /* tsx */ `
      expr('x^2 + 2x + 1')
    `}
    <p>
      Plusieurs opérations sont disponibles sur les expressions mathématiques, et voici les plus
      courantes:
    </p>
    <ul>
      <li>
        <strong>Égalité symbolique</strong>: on peut vérifier que deux expressions sont
        symboliquement égales. La méthode <code>isEqual</code> prend en argument une autre
        expression, ou son code {tex`\LaTeX`}.
        {hl('tsx') /* tsx */ `
          expr('x^2 + 2x + 1').isEqual('(x + 1)^2') // Promise<true>
        `}
      </li>
      <li>
        <strong>Égalité numérique à une erreur près</strong>:
        {hl('tsx') /* tsx */ `
          expr('\\\\pi')).isEqual('3.14', 0.1) // Promise<true>
          expr(1).isEqual(2, 0.1) // Promise<false>
        `}
      </li>
      <li>
        <strong>Substitutions</strong>: on peut remplacer des variables par d'autres expressions à
        l'aide de la méthode <code>subs</code>.
        {hl('tsx') /* tsx */ `
          expr('x^2 + 2x + 1').subs({ x: 'y'}) // y^2 + 2y + 1
          expr('x^2 + 2x + 1').subs({ x: 1 }) // 4
          expr('x_0 + v_0 t + a t^2 / 2').subs({ a: 9.81, v_0: 0, x_0: 0 })
        `}
        <Remark title="Variables indicées">
          Le système interprète <code>x0</code> comme {tex`x \cdot 0 = 0`}. Pour éviter cela, il
          faut écrire les variables indicées avec un underscore (<code>_</code>), c'est-à-dire{' '}
          <code>x_0</code>.
        </Remark>
      </li>
      <li>
        <strong>Simplifications</strong>: plusieurs méthodes de simplification sont disponibles,
        notamment <code>simplify</code>, <code>expand</code>, <code>factor</code>.
        {hl('tsx') /* tsx */ `
          expr('3 \\\\times 5').simplify() // 15
          expr('(x + 1)^2').expand() // x^2 + 2x + 1
          expr('x^2 + 2x + 1').factor() // (x + 1)^2
        `}
      </li>
      <li>
        <strong>Évaluation numérique</strong>: on peut évaluer une expression numériquement à l'aide
        de la méthode <code>N</code>. On peut optionnellement spécifier une précision en nombre de
        chiffres significatifs.
        {hl('tsx') /* tsx */ `
          expr('\\\\pi r^2').subs({ r: 2 }).N() // 12.566370614359172
          expr('\\\\pi').N(2) // 3.14
        `}
      </li>
      <li>
        <strong>Différentiation et intégration</strong>: on peut utiliser les méthodes{' '}
        <code>diff</code> et <code>integrate</code>:
        {hl('tsx') /* tsx */ `
          expr('x^2 + 2x + 1').diff('x') // 2x + 2
          expr('2x + 2').integrate('x') // x^2 + 2x (sans le + C!)
          expr('x').integrate('x', 0, 1) // 1/2
        `}
      </li>
    </ul>
    <Heading level={2}>Affichage d'expressions</Heading>
    <p>
      La fonction <code>tex</code> interagit bien avec les expressions et remplace toute expression
      du type <code>{'${...}'}</code> par son code {tex`\LaTeX`}.
    </p>
    {hl('tsx') /* tsx */ `
      <p>
        L'aire d'un disque de rayon {tex\`2\`} est
        {tex\`
          A
            = \\\\\pi r^2
            = \${expr('\\\\pi r^2').subs({ r: 2 })}
            = \${expr('\\\\pi r^2').subs({ r: 2 }).N()}
        \`}
      </p>
    `}
    <Heading level={1}>Création d'exercices</Heading>
    <Heading level={2}>Avec réponse préencodée</Heading>
    <p>
      Tout d'abord, commençons par l'exemple le plus simple possible: un exercice avec{' '}
      <strong>réponse préencodée</strong>. Voici l'exercice que nous allons tenter de répliquer:
    </p>
    <Example title="Exercice avec réponse préencodée">
      <Exercise id="simple" grade={(props) => props.attempt.isEqual(2)}>
        {(props) => (
          <p>
            Que vaut {tex`1 + 1`} ? {props.attempt}
          </p>
        )}
      </Exercise>
    </Example>
    <p>Le code permettant d'afficher la question est relativement simple</p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */>
        <p>Que vaut {tex\`1 + 1\`} ?</p>
      </Exercise>
    `}
    <p>
      Le problème du code ci-dessus est qu'il n'affiche pas le champ de saisie. Pour l'afficher, il
      faut procéder comme suit:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */>
        {(props) => <p>Que vaut {tex\`1 + 1\`} ? {props.attempt}</p>}
      </Exercise>
    `}
    <p>
      Dans le code ci-dessus, <code>props</code> est une variable qui contient toutes les{' '}
      <em>propriétés</em> de l'exercice. En particulier, <code>props.attempt</code> nous sera utile
      car il contient le <strong>champ de saisie</strong>.
    </p>
    <Remark title="Renommer le champ de saisie">
      <p>
        Notons qu'il est possible de renommer le champ <code>props.attempt</code> si nécéssaire, en
        spécifiant le paramètre <code>inputs</code> de l'exercice. Dans l'exemple ci-dessous, nous
        appelerons le champ de saisie <code>result</code>.
      </p>
      {hl('tsx') /* tsx */ `
        <Exercise inputs={['result']} /* (plus tard...) */>
          {(props) => <p>Que vaut {tex\`1 + 1\`} ? {props.result}</p>}
        </Exercise>
      `}
      <p>
        Ceci sera particulièrement utile plus tard pour les exercices avec plusieurs champs de
        saisie.
      </p>
    </Remark>
    <p>
      Il reste maintenant à voir comment <strong>corriger</strong> l'exercice. Ceci se fait en
      spécifant la propriété <code>grade</code> de <code>Exercise</code>. Dans notre cas, on
      souhaite vérifier que la tentative est égale à {tex`2`}. La proprieté <code>grade</code> aura
      également accès au champ de saisie via <code>props.attempt</code>.
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise grade={(props) => props.attempt.isEqual('1 + 1')} /* presque fini */>
        {(props) => <p>Que vaut {tex\`1 + 1\`} ? {props.attempt}</p>}
      </Exercise>
    `}
    <Remark title="Propriétés de la fonction de correction">
      <p>
        Remarquez que dans le code ci-dessus, <code>props.attempt</code> a une signification
        différente en fonction du contexte.
      </p>
      <ul>
        <li>
          Dans l'exercice lui-même, <code>props.attempt</code> représente le A
          <strong>champ de saisie</strong>.
        </li>
        <li>
          Dans la fonction de correction, <code>props.attempt</code> représente la{' '}
          <strong>valeur entrée</strong>, représentée comme une expression mathématique.
        </li>
      </ul>
    </Remark>
    <p>
      La dernière pièce manquante est qu'il faut préciser un identifiant unique <code>id</code> à
      l'exercice. Ceci permet de correctement grouper les tentatives des étudiants et étudiantes. Le
      code final est alors:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        id="1+1"
        grade={(props) => props.attempt.isEqual('1 + 1')}
      >
        {(props) => <p>Que vaut {tex\`1 + 1\`} ? {props.attempt}</p>}
      </Exercise>
    `}
    <Heading level={2}>Plusieurs champs de saisie</Heading>
    <p>
      Nous avons vu que par défaut, le champ de saisie s'appelle <code>attempt</code>. Qu'en est-il
      si nous voulions créer un exercice avec <strong>plusieurs champs de saisie</strong>?
    </p>
    <Example title="Exemple avec plusieurs champs de saisie">
      <p>Voici un exercice comportant deux champs de saisie indisociables.</p>
      <Exercise
        id="multiple-inputs"
        inputs={['a', 'b']}
        grade={(props) => expr('a + b').subs(props).isEqual(6)}
      >
        {(props) => (
          <>
            <p>
              Trouvez deux nombres {tex`a`} et {tex`b`} tels que {tex`a + b = 6`}.
            </p>
            <div class="flex items-center justify-center gap-4">
              <div>
                {tex`a = `}
                {props.a}
              </div>
              <div>
                {tex`b = `}
                {props.b}
              </div>
            </div>
          </>
        )}
      </Exercise>
    </Example>
    <p>
      Pour créer l'exercice plus haut, il suffit de nommer les champs de saisie via la propriété{' '}
      <code>inputs</code>. Nommons ces champs <code>a</code> et <code>b</code> comme suit:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        inputs={['a', 'b']}
        /* (id, grade...) */
      >
        {/* ... */}
      </Exercise>
    `}
    <p>
      Dans la fonction de correction et dans l'exercice, les champs de saisie (ou leur valeur en
      fonction du contexte) sont désormais accessibles via <code>props.a</code> et{' '}
      <code>props.b</code>.
    </p>
    <p>Le code final de l'exercice est alors:</p>
    {hl('tsx') /* tsx */ `
      <Exercise
        id="multiple-inputs"
        inputs={['a', 'b']}
        grade={(props) => expr('a + b').subs(props).isEqual(6)}
      >
        {(props) => (
          <p>
            Trouvez deux nombres {tex\`a\`} et {tex\`b\`} tels que {tex\`a + b = 6\`}.
            {tex\`a= \`} {props.a},
            {tex\`b = \`} {props.b}
          </p>
        )}
      </Exercise>
    `}
    <Heading level={2}>Feedback</Heading>
    <p>
      Pour afficher un retour aux étudiants, on peut exposer un composant <code>Feedback</code>
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        id="1+1-with-feedback"
        grade={(props) => props.attempt.isEqual('1 + 1')}
      >
        {(props, Feedback) => (
          <>
            <p>Que vaut {tex\`1 + 1\`} ? {props.attempt}</p>
            <Feedback>
              {tex\`
                1 + 1 = \${expr('1 + 1').simplify()}
              \`}
            </Feedback>
          </>
        )}
      </Exercise>
    `}
    <p>
      Par défaut, le feedback est affiché seulement si l'exercice est incorrect. Ce comportement
      peut être changé en spécifiant le paramètre <code>when</code> du composant{' '}
      <code>Feedback</code>. Les valeurs acceptées sont
    </p>
    <dl>
      <dt>always</dt>
      <dd>Affiche le feedback dès qu'une réponse est soumise.</dd>
      <dt>correct</dt>
      <dd>Affiche le feedback dès qu'une réponse est correcte.</dd>
      <dt>incorrect</dt>
      <dd>Affiche le feedback dès qu'une réponse est incorrecte.</dd>
    </dl>
    {hl('tsx') /* tsx */ `
      <Feedback when="always">
        <p>La réponse {props.attempt} a été soumise.</p>
      </Feedback>
      <Feedback when="correct">
        <p>La réponse {props.attempt} a été soumise et est correcte.</p>
      </Feedback>
      <Feedback when="incorrect">
        <p>La réponse {props.attempt} a été soumise et est correcte.</p>
      </Feedback>
    `}
    <Heading level={2}>Avec des paramètres aléatoires</Heading>
    <p>Et si je voulais faire varier des paramètres pour créer des exercices différents ?</p>
    <Example title="Exemple avec paramètres variables">
      <p>
        L'exercice que nous allons créer cette fois nous permet d'additionner deux{' '}
        <strong>nombres aléatoires</strong>.
      </p>
      <Exercise
        id="with-params"
        inputs={['c']}
        params={() => ({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })}
        grade={(props) => expr('a + b = c').subs(props).isTrue()}
      >
        {(props) => (
          <p>
            Que vaut {tex`${props.a} + ${props.b}`} ? {props.c}
          </p>
        )}
      </Exercise>
    </Example>
    <p>
      Les paramètres aléatoires sont déclarés dans la propriété <code>params</code> de{' '}
      <code>Exercise</code>. Il faut y spécifier une <strong>fonction</strong> qui explique comment
      générer les paramètres. Pour notre exemple, nous allons spécifier deux paramètres aléatoires{' '}
      <code>a</code> et <code>b</code>, choisis entre 1 et 3.
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        params={() => ({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })}
        /* (plus tard...) */
      >
        {/* ... */}
      </Exercise>
    `}
    <p>
      Les paramètres sont maintenant accessibles dans le composant et la fonction de correction via{' '}
      <code>props.a</code> et <code>props.b</code> respectivement.
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        params={() => ({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })}
        grade={(props) => expr('a + b').subs(props).isEqual(props.attempt)}
        /* (id...) */
      >
        {(props) => (
          <p>
            Que vaut {tex\`\${props.a} + \${props.b}\`} ? {props.attempt}
          </p>
        )}
      </Exercise>
    `}
    <Heading level={1}>Séquences d'exercices</Heading>
    <p>
      Les séquences permettent de grouper plusieurs exercices. Une pagination automatique est
      fournie, avec une coloration indiquant le progrès de l'étudiante ou de l'étudiant. Deux
      possibilités sont offertes:
    </p>
    <ul>
      <li>
        Une séquence <strong>prédéterminée</strong>, où les exercices doivent être explicitement
        encodés manuellement.
        <Example title="Séquence d'exercices prédéterminée">
          <Sequence id="sequence-example">
            <Factor expr="x^2 - 5x + 6" />
            <Factor expr="x^2 - 1" />
            <Exercise grade={(props) => props.attempt.isEqual(`\\pi`)}>
              {(props) => (
                <>
                  <p>Que vaut l'aire du cercle de rayon 1?</p>
                  {props.attempt}
                </>
              )}
            </Exercise>
          </Sequence>
        </Example>
      </li>
      <li>
        Une séquence <strong>générée</strong> à la volée, où les exercices apparaissent un à un au
        fur et à mesure que l'étudiante ou l'étudiant progresse.
        <Example title="Séquence d'exercices générée">
          <Sequence
            id="generated-sequence-example"
            exercise={Factor}
            next={() => {
              const x1 = sample([1, 2, 3, 4, 5, 6])
              const x2 = sample([1, 2, 3, 4, 5, 6])
              return { expr: expr(`(x - ${x1}) (x - ${x2})`).expand() }
            }}
          />
        </Example>
      </li>
    </ul>
    <Heading level={2}>Séquence prédéterminée</Heading>
    <p>
      La séquence prédéterminée est relativement simple à mettre en place: il suffit d'imbriquer les
      exercices à l'intérieur du composant <code>Sequence</code>. Cette dernière doit avoir un
      identifiant unique (<code>id</code>), mais les exercices eux-mêmes n'ont plus besoin d'
      <code>id</code>.
    </p>
    {hl('tsx') /* tsx */ `
      <Sequence id="sequence-example">
        <Factor expr="x^2 - 5x + 6" />
        <Factor expr="x^2 - 1" />
      </Sequence>
    `}
    <Heading level={2}>Séquence générée</Heading>
    <p>TODO</p>
    <Heading level={1}>Exemples</Heading>
    <Heading level={2}>Gravitation universelle</Heading>
    <Exercise
      id="universal-gravitation"
      inputs={['a', 'm', 'W']}
      params={() => ({
        G: '6.6743 \\times 10^{-11}',
        distanceUnit: sample(['m', 'km']),
        massUnit: sample(['g', 'kg']),
        ...sample([
          { planet: 'de la Terre', r: 6371008.4, M: 5.97217e24 },
          { planet: 'de Mercure', r: 2439400, M: 3.30103e23 },
          { planet: 'de Vénus', r: 6051800, M: 4.86731e24 },
          { planet: 'de Mars', r: 3389500, M: 6.41691e23 },
          { planet: 'de Jupiter', r: 69911000, M: 1.898125e27 },
          { planet: 'de Saturne', r: 58232000, M: 5.68317e26 },
          { planet: "d'Uranus", r: 25362000, M: 8.68099e25 },
          { planet: 'de Neptune', r: 24622000, M: 1.024092e26 },
        ]),
      })}
      grade={(props) =>
        Promise.all([
          expr('G M / r^2').subs(props).isEqual(props.a, 0.1),
          props.m.N() > 0,
          expr('m a').subs(props).isEqual(props.W, 0.1),
        ]).then((res) => res.every(Boolean))
      }
    >
      {(props, Feedback) => {
        const acc = createMemo(() => expr('G M / r^2').subs({ G: props.G, M: props.M, r: props.r }))
        const firstCheck = createMemo(() => props.state?.a.isEqual(acc(), 0.1))
        const secondCheck = createMemo(() =>
          props.state?.W.isEqual(expr('m a').subs({ m: props.state!.m, a: acc() }), 0.1),
        )
        const coherent = createMemo(() =>
          props.state?.W.isEqual(expr('m a').subs({ m: props.state!.m, a: props.state!.a }), 0.1),
        )
        return (
          <ol>
            <li>
              Déterminez l'accélération gravitationnelle à la surface {props.planet}, qui a pour
              rayon {tex`${expr(props.r, 'm').convert(props.distanceUnit)}`} et pour masse{' '}
              {tex`${expr(props.M, 'kg').convert(props.massUnit)}`}.
              <div class="flex items-center justify-center gap-4">
                {tex`a =`}
                {props.a}
                {tex`\mathrm{m}/\mathrm{s}^2`}
                <CheckMark value={firstCheck()} />
              </div>
              <Feedback when="always">
                <p>Après conversion,</p>
                {tex`
                  r = ${expr(props.r, 'm')},
                  \quad M = ${expr(props.M, 'kg')}
                `}
                <p>Dès lors, on a</p>
                {tex`
                  a = \frac{G M}{r^2}
                    = \frac{${props.G} \cdot ${props.M}}{${props.r}^2}
                    = ${acc().unit('m/s^2').N(3)}
                `}
              </Feedback>
            </li>
            <li>
              Donnez votre masse et calculez votre poids à la surface {props.planet}.
              <div class="flex items-center justify-center gap-16">
                <div class="flex items-center justify-center gap-4">
                  {tex`m = `}
                  {props.m}
                  {tex`\mathrm{kg}`}
                </div>
                <div class="flex items-center justify-center gap-4">
                  {tex`W = `}
                  {props.W}
                  {tex`\mathrm{N}`}
                  <CheckMark value={secondCheck()} />
                </div>
              </div>
              <Feedback when="always" correct={secondCheck()}>
                <Show when={!secondCheck() && coherent()}>
                  <p>
                    La réponse est cohérente avec l'accélération (incorrecte) entrée plus haute.
                  </p>
                </Show>
                {tex`
                  W = m a
                    = ${props.state?.m} \cdot ${acc().N(5)}
                    = ${expr('m a').subs({ m: props.state!.m, a: acc() }).unit('N').N(2)}
                `}
              </Feedback>
            </li>
          </ol>
        )
      }}
    </Exercise>
    <Heading level={2}>Masse molaire</Heading>
    <Exercise
      id="molar-mass"
      params={() => ({
        substance: sample([
          'H2O',
          'CO2',
          'O2',
          'N2',
          'CH4',
          'NH3',
          'H2SO4',
          'NaCl',
          'CaCO3',
          'C6H12O6',
        ]),
      })}
      grade={(props) => props.attempt.isEqual(substance(props.substance).molarMass(), 0.1)}
    >
      {(props) => (
        <>
          <p>Que vaut la masse molaire de {tex`${substance(props.substance)}`} ?</p>
          <div class="flex items-center gap-4">
            Réponse:
            {props.attempt}
            {tex`\mathrm{g}/\mathrm{mol}`}
          </div>
        </>
      )}
    </Exercise>
    <Heading level={2}>Question avec unités</Heading>
    <Exercise
      id="conversion"
      quantities={['attempt']}
      grade={(props) => props.attempt.isEqual('\\pi 2^2', '\\operatorname{\\mathrm{cm}}^2')}
    >
      {(props) => (
        <p>
          Quel est l'aire d'un disque de rayon {tex`${expr(2, 'cm')}`}: {props.attempt}
        </p>
      )}
    </Exercise>
  </Page>
)
