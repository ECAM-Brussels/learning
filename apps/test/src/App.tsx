import { Example, Remark } from '@learning/components/Environment'
import { Heading } from '@learning/components/Heading'
import { hl } from '@learning/components/Highlight'
import { Page } from '@learning/components/Page'
import { expr, tex } from '@learning/core'
import Exercise from '@learning/exercises/math/Exercise'
import { sample } from 'es-toolkit'
import './style.css'

export default () => (
  <Page title="Learning">
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
          \\int_a^b f'(x) \\, \\mathrm{d}x = f(b) - f(a)
        \`}
      `}
      {tex /* tex */ `
        \int_a^b f'(x) \, \mathrm{d}x = f(b) - f(a)
      `}
    </div>
    <Heading level={2}>Calcul formel</Heading>
    <p>
      Le calcul formel est la partie essentielle qui permet la génération d'exercices qui{' '}
      <em>tombent juste</em> et la correction symbolique.
    </p>
    {hl('tsx') /* tsx */ `
      expr('a').subs({ a: 9.81 }).integrate('t')
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
          Dans l'exercice lui-même, <code>props.attempt</code> représente le{' '}
          <strong>champ de saisie</strong>.
        </li>
        <li>
          Dans la fonction de correction, <code>props.attempt</code> représente la{' '}
          <strong>valeur entrée</strong>.
        </li>
      </ul>
    </Remark>
    <p>
      La dernière pièce manquante est qu'il faut préciser un identifiant unique <code>id</code> à
      l'exercice. Ceci permet de correctement grouper les tentatives des étudiants et étudiantes. Le
      code final est alors:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise id="1+1" grade={(props) => props.attempt.isEqual('1 + 1')}>
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
    <Heading level={2}>Séquences d'exercices</Heading>
  </Page>
)
