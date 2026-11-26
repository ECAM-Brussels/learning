// happy-dom lacks the SVG rendering methods JSXGraph calls.
Object.assign(SVGElement.prototype, {
  suspendRedraw: () => 0,
  unsuspendRedraw: () => {},
  unsuspendRedrawAll: () => {},
  forceRedraw: () => {},
  getBBox: () => ({ x: 0, y: 0, width: 0, height: 0 }),
})
// happy-dom does no layout, so boards would have no size, which breaks anything measured in pixels.
// The board's container is the element with the rounded-xl class from Board.tsx.
for (const key of ['clientWidth', 'clientHeight', 'offsetWidth', 'offsetHeight']) {
  Object.defineProperty(HTMLElement.prototype, key, {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('rounded-xl') ? 500 : 0
    },
  })
}

/** Simulates what the board does on a pointer drag, which happy-dom cannot dispatch. */
export function drag(point: JXG.Point, to: [number, number]) {
  point.setPosition(JXG.COORDS_BY_USER, to)
  // The board updates the dragged element before firing `drag`, e.g. so that a glider knows its position.
  point.update()
  ;(
    point as unknown as { triggerEventHandlers(e: string[], a: unknown[]): void }
  ).triggerEventHandlers(['drag'], [{}])
}
