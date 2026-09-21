import { Heading } from '@learning/components'
import { paths } from '../../router'
import banner from './banner.jpg'

export default () => (
  <>
    <img src={banner} class="h-90 w-full rounded-xl object-cover opacity-90" />
    <Heading level={1}>Méthodes numériques</Heading>
    <Heading level={2}>Séances d'exercices</Heading>
    <ol>
      <li>
        <a href={paths.MN1M['01-python']}>Introduction à Python</a>
      </li>
      <li>
        <a href={paths.MN1M['02-plots']}>Fonctions et graphiques</a>
      </li>
    </ol>
  </>
)
