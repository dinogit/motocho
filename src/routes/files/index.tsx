import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/files/page'
import type { SessionFileChanges, FileHistory, FileHistoryStats } from '@/shared/types/files'

export const Route = createFileRoute('/files/')({
  loader: async () => {
    const [sessions, files, stats] = await Promise.all([
      invoke<SessionFileChanges[]>('get_sessions_with_file_changes'),
      invoke<FileHistory[]>('get_file_histories'),
      invoke<FileHistoryStats>('get_file_history_stats'),
    ])
    return { sessions, files, stats }
  },
  component: Page,
})
