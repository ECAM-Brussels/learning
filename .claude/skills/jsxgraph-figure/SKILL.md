---
name: jsxgraph-figure
description: Create or change an interactive figure, plot or geometric construction with JSXGraph on the learning platform, or a component in `packages/components/src/Board.tsx`. Use whenever a request asks for a figure, graph, plot, curve, slider, construction or visualization ("figure", "graphe", "courbe", "curseur"), in a page, an exercise or a deck.
---

# Building a JSXGraph figure

## Use the declarative components

Build figures with the components in `packages/components/src/Board.tsx`:
`<Board>` and its elements (`Board.Plot`, `Board.Point`, `Board.Slider`, …),
each a _declarative version_ of a JSXGraph element.
They are not complete.
Improve them when a figure needs it,
keeping them declarative and compatible with Solid's reactivity:
props in, elements updated when props change, no imperative handle for the caller.

For a one-off construction they don't cover, use `Board.Custom` with plain JSXGraph code,
rather than adding a component or managing the board by hand.

Teachers' view of these components: `apps/ecam/src/routes/doc/figures.mdx`.
Update it, and `figures.demo.tsx`, when a component is added or its props change.

## Defaults

- For defaults shared by many boards, such as a teacher's preferences for a course,
  wrap them in `BoardDefaults` (e.g. in the folder's `_layout.tsx`)
  rather than repeating props on every element.
- Keep JSXGraph's attribute names and shapes.
  Where these components depart from JSXGraph's defaults, do it in `builtInDefaults` in `Board.tsx`.

## Labels

JSXGraph places labels away from other elements with `label: { autoPosition: true }`:
never reimplement label placement.

- It is on by default on 2D boards;
  set `label: { autoPosition: false }` to keep a label where `offset` puts it.
- In a 3D view it is off by default,
  because each label is checked against the view's hundreds of elements at every update.
  Turn it on for the labels that need it, e.g. `<Board.Point3D label={{ autoPosition: true }} …/>`,
  rather than for the whole view.

## Coordinates are positions, not points

Points JSXGraph creates for coordinates or bounds
(polygon vertices, an angle's points, an integral's bounds) are hidden.
For a visible point, pass a `<Board.Point>`.

## Function props and signals

A function prop such as `fn` redraws when the function is replaced,
not when a signal read inside it changes.
Derive the function from its signals, reading them outside the function it returns:

```tsx
const f = createMemo(() => {
  const c = k()
  return (x: number) => c * x
})
<Board.Plot fn={f()} />
```

`fn={(x) => k() * x}` would never redraw.

## Animations

Animate a figure with `onFrame` on `<Board>`: it is called at each frame with the seconds since the last one,
and is skipped while the board is hidden, e.g. on a slide not shown.
Move signals forward in it, and pass `undefined` to pause: `onFrame={playing() ? step : undefined}`.
In a `Board.Custom` construction, keep what JSXGraph reads at each redraw in plain variables,
and call `board.update()` from `onFrame`, whose second argument is the board.

## Check it

- Name signals and memos (`{ name: '…' }`), and run tests with `--conditions=development` once,
  to see Solid's diagnostics; their repair guide is `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`.
- Component tests: `packages/components/src/Board.test.tsx`.
- Look at the figure on the dev server:
  labels, what can be dragged, and what follows when it is dragged.
