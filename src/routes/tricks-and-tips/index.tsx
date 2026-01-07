import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/ticks-and-tips/page.tsx'

export const Route = createFileRoute('/tricks-and-tips/')({
  component: Page,
})