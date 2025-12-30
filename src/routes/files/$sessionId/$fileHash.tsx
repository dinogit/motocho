import { createFileRoute } from '@tanstack/react-router'
import { DiffPage } from '@/features/files/diff-page'
import { getFileChangeByHash } from '@/shared/services/files/server-functions'

export const Route = createFileRoute('/files/$sessionId/$fileHash')({
  loader: async ({ params }) => {
    return getFileChangeByHash({
      data: { sessionId: params.sessionId, hash: params.fileHash },
    })
  },
  component: DiffPage,
})
