import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/analytics/page'
import { getAnalyticsData, getAnalyticsSummary } from '@/shared/services/analytics/client'

export const Route = createFileRoute('/analytics')({
  loader: async () => {
    const [stats, summary] = await Promise.all([
      getAnalyticsData(),
      getAnalyticsSummary(),
    ])
    return { stats, summary }
  },
  component: Page,
})