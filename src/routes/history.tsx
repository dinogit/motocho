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

    const projects: HistoryProjectInfo[] = [
      ...codeProjects.map(p => ({ ...p, source: 'code' as const })),
      ...codexProjects
    ]

    const getDateTimeMs = (date: Date | number) => date instanceof Date ? date.getTime() : date

    const stats: HistoryStats | null = codeStats && codexStats
      ? {
          totalPrompts: codeStats.totalPrompts + codexStats.totalPrompts,
          uniqueProjects: codeStats.uniqueProjects + codexStats.uniqueProjects,
          uniqueSessions: codeStats.uniqueSessions + codexStats.uniqueSessions,
          dateRange: {
            first: new Date(Math.min(getDateTimeMs(codeStats.dateRange.first), getDateTimeMs(codexStats.dateRange.first))),
            last: new Date(Math.max(getDateTimeMs(codeStats.dateRange.last), getDateTimeMs(codexStats.dateRange.last))),
          },
        }
      : (codeStats || codexStats)

    return { results, projects, stats }
  },
  component: Page,
})
