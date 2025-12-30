import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/sessions/page'
import { getSessionDetails } from '@/shared/services/transcripts/server-functions'

export const Route = createFileRoute('/transcripts/$projectId/$sessionId')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ params, deps }) =>
    getSessionDetails({
      data: {
        projectId: params.projectId,
        sessionId: params.sessionId,
        page: deps.page,
      },
    }),
  component: Page,
})