import { createContext } from 'solid-js'

export const FeedbackContext = createContext<{ correct?: boolean }>({ correct: undefined })
