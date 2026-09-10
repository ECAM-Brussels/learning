import { createEffect, createSignal, onSettled } from 'solid-js'

export function createIsVisible(element: () => HTMLElement | null) {
  const [observer, setObserver] = createSignal<IntersectionObserver | null>(null)
  const [isIntersecting, setIsIntersecting] = createSignal(false)

  onSettled(() => {
    setObserver(
      new IntersectionObserver(
        ([entry]) => {
          if (entry) setIsIntersecting(entry.isIntersecting)
        },
        { threshold: 0.1 },
      ),
    )
    return () => observer()?.disconnect()
  })

  createEffect(
    () => [element(), observer()] as const,
    ([el, observer]) => {
      if (el && observer) observer.observe(el)
    },
  )

  return isIntersecting
}
