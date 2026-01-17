import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/analytics/page'
import type { StatsCache, AnalyticsSummary } from '@/shared/types/analytics'

export const Route = createFileRoute('/analytics')({
  loader: async () => {
    const [stats, summary] = await Promise.all([
      invoke<StatsCache>('get_analytics_data'),
      invoke<AnalyticsSummary>('get_analytics_summary'),
    ])
    return { stats, summary }
  },
  component: Page,
})