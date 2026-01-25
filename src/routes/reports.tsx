import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/reports/page'
import type { Project } from '@/shared/types/transcripts'

export const Route = createFileRoute('/reports')({
  loader: async () => {
    const projects = await invoke<Project[]>('get_projects')
    return { projects }
  },
  component: Page,
})
