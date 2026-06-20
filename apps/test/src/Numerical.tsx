import { Code, Heading, Page } from '@learning/components'
import dedent from 'dedent'

export default () => (
  <Page title="Session 1">
    <Heading level={1}>Introduction à Python</Heading>
    <Heading level={2}>Opérations arithmétiques</Heading>
    <Heading level={2}>La librairie math</Heading>
    <Heading level={2}>Construction de listes</Heading>
    <Heading level={1}>Fonctions</Heading>
    <Heading level={1}>Graphiques avec matplotlib</Heading>
    <Heading level={1}>Se préparer à l'examen</Heading>
    <Code lang="python" run math>
      {dedent /* python */ `
        from matplotlib.pyplot import *

        X = range(0, 5.001, 0.001)
        y = [sin(x) for x in X]

        plot(X, y)
        title("Mon super graphique")
      `}
    </Code>
    <Code lang="python" run math>
      {dedent /*python */ `
        from numpy import *
        from matplotlib.pyplot import *

        x = linspace(0, 2*pi, 100)
        y = sin(x)

        plot(x, y)
      `}
    </Code>
  </Page>
)
