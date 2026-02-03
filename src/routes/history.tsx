import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/history/page'
import type { HistoryStats, SearchResult, HistoryProjectInfo } from '@/shared/types/history'
import { getCodexHistory, getCodexHistoryProjects, getCodexHistoryStats, getHistory, getHistoryProjects, getHistoryStats } from '@/shared/services/history/client'

export const Route = createFileRoute('/history')({
  loader: async () => {
    const [codeResults, codexResults, codeProjects, codexProjects, codeStats, codexStats] = await Promise.all([
      getHistory(100),
      getCodexHistory(100),
      getHistoryProjects(),
      getCodexHistoryProjects(),
      getHistoryStats(),
      getCodexHistoryStats(),
    ])

    const results: SearchResult[] = [...codeResults, ...codexResults].sort(
      (a, b) => b.entry.timestamp - a.entry.timestamp
    )

    const projects: HistoryProjectInfo[] = [...codeProjects, ...codexProjects]

    const stats: HistoryStats | null = codeStats && codexStats
      ? {
          totalPrompts: codeStats.totalPrompts + codexStats.totalPrompts,
          uniqueProjects: codeStats.uniqueProjects + codexStats.uniqueProjects,
          uniqueSessions: codeStats.uniqueSessions + codexStats.uniqueSessions,
          dateRange: {
            first: Math.min(codeStats.dateRange.first as any, codexStats.dateRange.first as any),
            last: Math.max(codeStats.dateRange.last as any, codexStats.dateRange.last as any),
          },
        }
      : (codeStats || codexStats)

    return { results, projects, stats }
  },
  component: Page,
})
