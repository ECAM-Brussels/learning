# Code style for the IA1M course

## Type annotations

Write as few type annotations as possible,
and let TypeScript infer types wherever it can.
Annotate only where inference can't work,
such as the parameters of a top-level function or component.

Pass values straight to a component as JSX props,
where the component's own props type checks them,
rather than building a typed object first and spreading it:

```tsx
<Draw2D target={ctx.data} locked={ctx.state.correct === true} />
```

instead of

```tsx
const placing = {
  get target(): Pair {
    return ctx.data
  },
}
<Draw2D {...placing} />
```
