import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/analytics/page'
import type { AnalyticsV2 } from '@/shared/types/analytics-v2'

export const Route = createFileRoute('/analytics')({
  loader: async () => {
    const analytics = await invoke<AnalyticsV2>('get_analytics_v2')
    return { analytics }
  },
  component: Page,
})
