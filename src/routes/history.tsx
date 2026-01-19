import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/history/page'
import type { HistoryEntry, HistoryStats } from '@/shared/types/history'

export const Route = createFileRoute('/history')({
  loader: async () => {
    const [results, projects, stats] = await Promise.all([
      invoke<HistoryEntry[]>('get_history', { limit: 100 }),
      invoke<string[]>('get_history_projects'),
      invoke<HistoryStats>('get_history_stats'),
    ])
    return { results, projects, stats }
  },
  component: Page,
})