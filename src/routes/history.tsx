import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/history/page'
import { getHistory, getHistoryProjects, getHistoryStats } from '@/shared/services/history/client'

export const Route = createFileRoute('/history')({
  loader: async () => {
    const [results, projects, stats] = await Promise.all([
      getHistory({ data: { limit: 100 } }),
      getHistoryProjects(),
      getHistoryStats(),
    ])
    return { results, projects, stats }
  },
  component: Page,
})