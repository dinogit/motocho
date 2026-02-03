import { useLoaderData } from '@tanstack/react-router'
import { SessionList } from '@/features/transcripts/components/session-list'
import { Badge } from '@/shared/components/ui/badge'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
  PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import type { Project, Session } from '@/shared/types/transcripts'

type LoaderData = {
  project: Project
  sessions: Session[]
  source: 'code' | 'codex' | 'both'
}

export function ProjectPage() {
  const data = useLoaderData({ from: '/transcripts/$projectId/' }) as LoaderData
  const { project, sessions, source } = data
  const sourceLabel = source === 'both' ? 'Code + Codex' : source === 'codex' ? 'Codex' : 'Code'

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle className="flex items-center gap-2">
            {project.displayName}
            <Badge variant="secondary">{sourceLabel}</Badge>
          </PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            {project.path}
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-4 p-6">
        <SessionList sessions={sessions} projectId={project.id} source={source} />
      </div>
    </>
  )
}
