import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/files/page'
import {
  getSessionsWithFileChanges,
  getFileHistories,
  getFileHistoryStats,
} from '@/shared/services/files/server-functions'

export const Route = createFileRoute('/files/')({
  loader: async () => {
    const [sessions, files, stats] = await Promise.all([
      getSessionsWithFileChanges(),
      getFileHistories(),
      getFileHistoryStats(),
    ])
    return { sessions, files, stats }
  },
  component: Page,
})
