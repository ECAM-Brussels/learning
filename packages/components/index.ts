import { clientOnly } from '@solidjs/web'

export * from './src/Attempt'
export * from './src/Boundary'
export * from './src/Breadcrumbs'
export * from './src/Card'
export * from './src/CheckMark'
export * from './src/Code'
export * from './src/Environment'
export * from './src/Fa'
export * from './src/Feedback'
export * from './src/FeedbackContext'
export * from './src/Heading'
export * from './src/Highlight'
export * from './src/Latex'
export * from './src/Markdown'
export * from './src/Meta'
export * from './src/Page'
export * from './src/Pagination'
export * from './src/Scope'
export * from './src/Slide'
export * from './src/Slideshow'

export const Board = clientOnly(() => import('./src/Board'))
export const MathField = clientOnly(() => import('./src/MathField'))
export const Python = clientOnly(() => import('./src/Python'))
