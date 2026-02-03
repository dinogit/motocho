import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/sessions/page'
import { getCodexSessionDetails, getSessionDetails } from '@/shared/services/transcripts/client'

export const Route = createFileRoute('/transcripts/$projectId/$sessionId')({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
    source: search.source === 'codex' ? 'codex' : 'code',
  }),
  loaderDeps: ({ search }) => ({ page: search.page, source: search.source as 'code' | 'codex' }),
  loader: ({ params, deps }) => {
    if (deps.source === 'codex') {
      return getCodexSessionDetails(params.projectId, params.sessionId, deps.page)
    }
    return getSessionDetails(params.projectId, params.sessionId, deps.page)
  },
  component: Page,
})
