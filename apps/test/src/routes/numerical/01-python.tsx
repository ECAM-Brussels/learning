import { Attempt, Code, Example, Heading, Page } from '@learning/components'
import { Exercise, Sequence, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import dedent from 'dedent'
import { Show } from 'solid-js'

export default () => (
  <Page title="Introduction à Python">
    <Heading level={1}>Premiers pas</Heading>
    <p>
      L'objectif de cette activité est de vous guider dans vos premiers pas en programmation. Ne
      vous inquiétez pas si vous n'avez jamais programmé, puisque nous allons commencer de zéro et
      procéder pas à pas. Le langage de programmation que nous allons employer s'appelle{' '}
      <strong>Python</strong>. Il a été choisi d'une part pour son omniprésence dans le monde
      scientifique et d'autre part pour sa syntaxe simple et intuitive.
    </p>
    <p>
      Pour commencer, nous vous présenterons des exemples de code Python, avec leur résultat. Nous
      vous encourageons à les modifier et observer les effets de vos changements. Les lignes de code
      sont numérotées pour vous aider, mais ces nombres ne font pas partie du code.
    </p>
    <Example title="Bonjour Python">
      <p>
        Voici notre premier exemple de code Python, qui affiche <code>Bonjour tout le monde !</code>
        .
      </p>
      <Code lang="python" run>
        {dedent /* python */ `
            print("Bonjour tout le monde !")
          `}
      </Code>
      <p>
        Modifiez le, par exemple pour qu'un message différent soit affiché. Félicitations, vous avez
        modifié votre premier code Python!
      </p>
    </Example>
    <p>
      Pour vérifier votre compréhension, nous vous poserons des questions, qui demanderont parfois
      de saisir une réponse mathématique, ou de modifier un code.
    </p>
    <Example title="Exemple de question mathématique">
      <Exercise
        id="example-question"
        schema={{ data: { question: 'expr' }, inputs: { attempt: 'expr' } }}
        data={{ question: '2 + 2' }}
        prompt={(ctx) => (
          <Attempt>
            {tex`${ctx.data.question} =`} {ctx.inputs.attempt}
          </Attempt>
        )}
        grade={(ctx) => ctx.inputs.attempt.isEqual(4)}
        feedback={(ctx) => (
          <Show
            when={ctx.correct}
            fallback={
              <>
                <p>Essayez encore!</p>
                <ctx.Self />
              </>
            }
          >
            <p>Bravo! La réponse est correcte.</p>
          </Show>
        )}
      />
    </Example>
    <Heading level={1}>Python comme calculatrice</Heading>
    <p>
      La première chose que nous allons apprendre est comment effectuer des opérations
      arithmétiques. La syntaxe est généralement ce à quoi vous vous attendriez, puisque{' '}
      <code>+</code>, <code>-</code>, <code>*</code> et <code>/</code> représentent respectivement
      l'<em>addition</em>, la <em>soustraction</em>, la <em>multiplication</em> et la{' '}
      <em>division</em>.
    </p>
    <Example title="Opération arithmétiques">
      <Code lang="python" run>
        3 * 5
      </Code>
    </Example>
    <p>Il faut cependant faire attention aux points suivants.</p>
    <ul>
      <li>
        On utilise le point <code>.</code> comme <strong>séparateur décimal</strong> au lieu de la
        virgule.
        <Example title="Calcul avec un séparateur décimal">
          <Code lang="python" run>
            3.14 * 100
          </Code>
        </Example>
      </li>
      <li>
        Pour calculer une puissance, on utilise l'opérateur <code>**</code>.
        <Example title="Calcul d'une puissance">
          <Code lang="python" run>
            3.14 * 2 ** 2
          </Code>
        </Example>
      </li>
    </ul>
    <Sequence id="python-as-calculator">
      <PythonCode
        prompt={<p>Utilisez Python pour calculer {tex`0.1 \times 0.1`}</p>}
        tests={[
          {
            test: null,
            check: ({ result }) => result === '0.010000000000000002',
            desc: 'Le résultat doit être 0.01',
          },
        ]}
      />
      <PythonCode
        prompt={<p>Utilisez Python pour calculer {tex`0.1 \times 0.1`}</p>}
        tests={[
          {
            test: null,
            check: ({ result }) => result === '0.010000000000000002',
            desc: 'Le résultat doit être 0.01',
          },
        ]}
      />
    </Sequence>
    <Heading level={1}>Fonctions mathématiques</Heading>
  </Page>
)
