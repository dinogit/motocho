import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/hooks/page'

export const Route = createFileRoute('/hooks/')({
  component: Page,
})