import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/docs/page'

export const Route = createFileRoute('/docs')({
    component: Page,
})
