import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/sessions/page'
import { getSessionDetails } from '@/shared/services/transcripts/client'

export const Route = createFileRoute('/transcripts/$projectId/$sessionId')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ params, deps }) =>
    getSessionDetails(params.projectId, params.sessionId, deps.page),
  component: Page,
})