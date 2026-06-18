import { Answer, CheckMark, Example, Heading, hl, Remark } from '@learning/components'
import { Step as Exercise, expr, tex } from '@learning/core'
import './style.css'

export const Documentation = () => (
  <>
    <p class="text-lg">
      Learning est un framework permettant de créer des applications d'apprentissage interactives.
      Dans cette page, nous vous présentons comment créer une simple séquence d'exercices corrigés
      symboliquement.
    </p>
    <Heading level={1}>Motivations</Heading>
    <p>
      Les plateformes d'apprentissage traditionnelles ne présentent qu'un support mathématique
      limité et reposent sur un grand nombre de contributeurs pour encoder manuellement des
      exercices différents, leurs réponses, leurs corrections et le feedback associé. L'idée
      centrale de learning consiste à mettre le calcul formel au cœur du système.
    </p>
    <p>Les conséquences de cette approche</p>
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
      qui prend en argument le code {tex`\LaTeX`} de l'expression. L'unité peut également être
      spécifiée en deuxième argument.
    </p>
    {hl('tsx') /* tsx */ `
      expr('x^2 + 2x + 1')
      expr('5', 'km/h')
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
      <li>
        <strong>Conversion d'unités</strong>: on peut convertir les expressions avec unités comme
        suit:
        {hl('tsx') /* tsx */ `
          expr('5', 'km').convert('m') // 5000m
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
      <Exercise
        id="simple"
        inputs={{ attempt: 'expr' }}
        feedback={(inputs) => ({ correct: inputs.attempt.isEqual(2) })}
        prompt={(inputs) => (
          <>
            <p>Que vaut {tex`1 + 1`} ?</p>
            <Answer>Réponse: {inputs.attempt}</Answer>
          </>
        )}
      />
    </Example>
    <p>Le code permettant d'afficher la question est relativement simple</p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */
        prompt={() => <p>Que vaut {tex\`1 + 1\`} ?</p>}
      />
    `}
    <p>
      Le problème du code ci-dessus est qu'il n'affiche pas le champ de saisie. Pour l'afficher, il
      faut procéder comme suit:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */
        inputs={{ attempt: 'expr' }}
        prompt={(inputs) => <p>Que vaut {tex\`1 + 1\`} ? {inputs.attempt}</p>}
      />
    `}
    <p>
      Dans le code ci-dessus, la propriété <code>inputs</code> permet de nommer et de spécifier le
      type des chams de saisie. En l'occurence, nous demandons ici que le champ soit nommé{' '}
      <code>attempt</code> et qu'il soit de type <code>expr</code>, c'est-à-dire qu'il s'agit d'une
      expression mathématique. Le champ de saisie est ensuite accessible dans <code>prompt</code>{' '}
      via <code>inputs.attempt</code>.
    </p>
    <p>
      Il reste maintenant à voir comment <strong>corriger</strong> l'exercice. Ceci se fait en
      spécifant la propriété <code>feedback</code> de <code>Exercise</code>. Dans notre cas, on
      souhaite vérifier que la tentative est égale à {tex`2`}. La proprieté <code>feedback</code>{' '}
      aura également accès à la valeur du champ de saisie, vue comme expression mathématique, via{' '}
      <code>inputs.attempt</code>.
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */
        inputs={{ attempt: 'expr' }}
        feedback={(inputs) => ({ correct: inputs.attempt.isEqual(2) })}
        prompt={(inputs) => <p>Que vaut {tex\`1 + 1\`} ? {inputs.attempt}</p>}
      />
    `}
    <Remark title="Propriétés de la fonction de correction">
      <p>
        Remarquez que dans le code ci-dessus, <code>inputs.attempt</code> a une signification
        différente en fonction du contexte.
      </p>
      <ul>
        <li>
          Dans l'exercice lui-même, <code>inputs.attempt</code> représente le{' '}
          <strong>champ de saisie</strong>.
        </li>
        <li>
          Dans la fonction de correction, <code>inputs.attempt</code> représente la{' '}
          <strong>valeur entrée</strong>, représentée comme une expression mathématique.
        </li>
      </ul>
    </Remark>
    <p>
      Placer correctement le champ de réponse avec un <CheckMark value={true} /> est une tâche
      répétitive. Il est recommandé d'utiliser le composant <code>Answer</code> qui se charge de
      cela automatiquement. Le code devient alors:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */
        inputs={{ attempt: 'expr' }}
        feedback={(inputs) => ({ correct: inputs.attempt.isEqual(2) })}
        prompt={(inputs) => (
          <>
            <p>Que vaut {tex\`1 + 1\`} ? {inputs.attempt}</p>
            <Answer>Réponse: {inputs.attempt}</Answer>
          </>
        )}
      />
    `}
    <p>
      Dans le code ci-dessus, nous tombons sur une subtilité du langage TSX. Une fonction ne peut
      retourner qu'un seul élément, or nous en avons deux: <code>p</code> et <code>Answer</code>.
      Pour régler ce problème, il suffit de les envelopper dans une balise vide{' '}
      <code>&lt;&gt;</code> appelée <em>fragment</em>.
    </p>
    <p>
      La dernière pièce manquante est qu'il faut préciser un identifiant unique <code>id</code> à
      l'exercice. Ceci permet de correctement grouper les tentatives des étudiants et étudiantes. Le
      code final est alors:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        id="mon-premier-exercice"
        inputs={{ attempt: 'expr' }}
        feedback={(inputs) => ({ correct: inputs.attempt.isEqual(2) })}
        prompt={(inputs) => (
          <>
            <p>Que vaut {tex\`1 + 1\`} ? {inputs.attempt}</p>
            <Answer>Réponse: {inputs.attempt}</Answer>
          </>
        )}
      />
    `}
    <Heading level={2}>Plusieurs champs de saisie</Heading>
    <Example title="Exemple avec plusieurs champs de saisie">
      <p>Voici un exercice comportant deux champs de saisie indisociables.</p>
      <Exercise
        id="multiple-inputs"
        inputs={{ a: 'expr', b: 'expr' }}
        feedback={(inputs) => ({ correct: expr('a + b').subs(inputs).isEqual(6) })}
        prompt={(inputs) => (
          <>
            <p>
              Trouvez deux nombres {tex`a`} et {tex`b`} tels que {tex`a + b = 6`}.
            </p>
            <Answer>
              {tex`a = `}
              {inputs.a}
              {tex`\quad b = `}
              {inputs.b}
            </Answer>
          </>
        )}
      />
    </Example>
    <p>
      Pour créer l'exercice plus haut, il suffit de nommer les champs de saisie via la propriété{' '}
      <code>inputs</code>. Nommons ces champs <code>a</code> et <code>b</code> comme suit:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        inputs={{ a: 'expr', b: 'expr' }}
        /* (id, grade...) */
      >
        {/* ... */}
      </Exercise>
    `}
    <p>
      Dans la fonction de correction et dans l'exercice, les champs de saisie (ou leur valeur en
      fonction du contexte) sont désormais accessibles via <code>inputs.a</code> et{' '}
      <code>inputs.b</code>.
    </p>
    <p>Le code final de l'exercice est alors:</p>
    {hl('tsx') /* tsx */ `
      <Exercise
        id="multiple-inputs"
        inputs={{ a: 'expr', b: 'expr' }}
        feedback={(inputs) => ({ correct: expr('a + b').subs(inputs).isEqual(6) })}
        prompt={(inputs) => (
          <p>
            Trouvez deux nombres {tex\`a\`} et {tex\`b\`} tels que {tex\`a + b = 6\`}.
            <Answer>
              {tex\`a = \`}
              {inputs.a}
              {tex\`\\quad b = \`}
              {inputs.b}
            </Answer>
          </p>
        )}
      />
    `}
    <Heading level={2}>Feedback</Heading>
    <p>
      Pour afficher un retour aux étudiants, il existe un composant <code>Feedback</code>
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise
        id="1+1-with-feedback"
        grade={(props) => props.attempt.isEqual('1 + 1')}
      >
        {(props) => (
          <>
            <p>Que vaut {tex\`1 + 1\`}</p>
            <Answer>Réponse: {props.attempt}</Answer>
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
  </>
)
