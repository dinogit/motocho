---
name: feature-scaffolding
description: Scaffolds new feature pages following project patterns. Use when creating new pages, features, routes, or when user asks to set up a new section. Works with component-organization skill for structure.
---

# Feature Scaffolding

Create new feature pages following the established project patterns.

## Standard Structure

```
src/features/{feature-name}/
  page.tsx              # Main page, imports and composes components
  components/           # Feature-specific components (one per file)
    component-name.tsx
  types.ts              # (if needed) Feature-specific types
```

## page.tsx Template

```tsx
import { ComponentName } from './components/component-name'

export function Page() {
  return (
    <div>
      <ComponentName />
    </div>
  )
}
```

## Component Template

```tsx
// components/component-name.tsx
interface ComponentNameProps {
  // props here
}

export function ComponentName({ ...props }: ComponentNameProps) {
  return (
    // JSX here
  )
}
```

## Rules

1. **One component per file** - See component-organization skill
2. **Kebab-case filenames** - `summary-card.tsx`, not `SummaryCard.tsx`
3. **Named exports** - `export function X`, not `export default`
4. **No barrel files** - Import directly from component files
5. **Avoid useEffect** - Prefer event handlers, props, and state

## When to Apply

- Creating a new feature/page from scratch
- User asks to "scaffold", "set up", or "create" a new section
- Adding a new route that needs standard structure