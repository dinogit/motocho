import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/claude-code/page.tsx'

export const Route = createFileRoute('/claude-code')({
  component: Page,
})