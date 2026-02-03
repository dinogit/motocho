import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/transcripts/page.tsx'
import { getCodexProjects, getProjects } from '@/shared/services/transcripts/client'

export const Route = createFileRoute('/transcripts/')({
  loader: async () => {
    const [code, codex] = await Promise.all([getProjects(), getCodexProjects()])
    return [...code, ...codex].sort((a, b) => Number(b.lastModified) - Number(a.lastModified))
  },
  component: Page,
})
