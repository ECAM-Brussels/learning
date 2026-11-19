import { Meta } from '@learning/components'
import { getUser, hasPermissions } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import type { JSX } from '@solidjs/web'
import type { paths } from '../../router'
import session4 from './automatic-differentiation.jpg'
import session3 from './differences.jpg'
import session6 from './integration.svg'
import session2 from './matplotlib.jpg'
import session5 from './optimisation.jpg'
import session1 from './python.jpg'

export interface Session {
  index: number
  title: string
  link: keyof typeof paths.MN1M
  img?: string
  release?: Date
}

export const sessions = [
  {
    index: 1,
    title: 'Introduction à Python',
    link: '01-python',
    img: session1,
  },
  {
    index: 2,
    title: 'Fonctions et graphiques',
    link: '02-plots',
    img: session2,
    release: new Date('2026-10-02 07:00'),
  },
  {
    index: 3,
    title: 'Différences finies',
    link: '03-diff',
    img: session3,
    release: new Date('2026-10-16 07:00'),
  },
  {
    index: 4,
    title: 'Dérivation automatique',
    link: '04-automatic-differentiation',
    img: session4,
    release: new Date('2026-11-05 07:00'),
  },
  {
    index: 5,
    title: 'Optimisation',
    link: '05-optimisation',
    img: session5,
    release: new Date('2026-11-16 07:00'),
  },
  {
    index: 6,
    title: 'Intégration',
    link: '06-integration',
    img: session6,
    release: new Date('2026-11-24 07:00'),
  },
] as const satisfies readonly Session[]

type KnownLink = (typeof sessions)[number]['link']

function getSession(link: KnownLink): Session {
  return sessions.find((session) => session.link === link)!
}

export function isReleased(session: Session, now = new Date()): boolean {
  return session.release === undefined || now >= session.release
}

export const sessionRoute = {
  preload() {
    getUser()
    hasPermissions(['draft:read'])
  },
} satisfies RouteDefinition

export function SessionPage(props: { link: KnownLink; children: JSX.Element }) {
  const session = () => getSession(props.link)
  return (
    <Meta
      title={`Séance ${session().index}: ${session().title}`}
      authorized={() => isReleased(session()) || hasPermissions(['draft:read'])}
    >
      {props.children}
    </Meta>
  )
}
