import { createFileRoute } from '@tanstack/react-router'
import { SessionPage } from '@/features/files/session-page'
import { getSessionFileChanges } from '@/shared/services/files/client'

export const Route = createFileRoute('/files/$sessionId/')({
  loader: async ({ params }) => {
    return getSessionFileChanges({ data: params.sessionId })
  },
  component: SessionPage,
})
