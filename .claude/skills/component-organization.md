# Component Organization Skill

## Rule
When creating React components for a feature page, **never** put multiple component functions in a single `page.tsx` file.

## Pattern

### Instead of this (BAD):
```
features/analytics/
  page.tsx  ← Contains Page + SummaryCard + DailyActivityChart + etc.
```

### Do this (GOOD):
```
features/analytics/
  page.tsx           ← Only imports and composes components
  components/
    summary-card.tsx
    daily-activity-chart.tsx
    hourly-activity-chart.tsx
    tokens-chart.tsx
    model-usage-card.tsx
```

## Implementation

1. **page.tsx** should only contain:
   - Imports from `./components/`
   - The main `Page` function that composes the imported components
   - Data fetching/loader logic if needed

2. **components/** folder should contain:
   - One component per file
   - File names in kebab-case matching the component name
   - Each file exports a single named component

## Example

**page.tsx:**
```tsx
import { SummaryCard } from './components/summary-card'
import { DailyActivityChart } from './components/daily-activity-chart'

export function Page() {
  return (
    <div>
      <SummaryCard />
      <DailyActivityChart />
    </div>
  )
}
```

**components/summary-card.tsx:**
```tsx
export function SummaryCard({ title, value, icon }: SummaryCardProps) {
  return (...)
}
```

## When to Apply

Apply this rule when:
- Creating a new feature page with 2+ custom components
- Refactoring an existing page with inline components
- The page.tsx file exceeds ~100 lines