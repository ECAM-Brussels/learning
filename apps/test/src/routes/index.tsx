import { Heading, Page } from '@learning/components'

export default function Home() {
  return (
    <Page>
      <Heading level={1}>Bienvenue</Heading>
      <ul>
        <li>
          <a href="/numerical">Analyse Numérique</a>
        </li>
        <li>
          <a href="/test">Test</a>
        </li>
      </ul>
    </Page>
  )
}
