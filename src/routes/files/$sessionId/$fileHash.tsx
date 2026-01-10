import { createFileRoute } from '@tanstack/react-router'
import { DiffPage } from '@/features/files/diff-page'
import { getFileChangeByHash } from '@/shared/services/files/client'

export const Route = createFileRoute('/files/$sessionId/$fileHash')({
  loader: async ({ params }) => {
    return getFileChangeByHash(params.sessionId, params.fileHash)
  },
  component: DiffPage,
})
