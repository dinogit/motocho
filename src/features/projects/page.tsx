/**
 * Project Page
 *
 * Displays a project's efficiency metrics and session list.
 */

import { Route } from '@/routes/transcripts/$projectId/index'
import { SessionList } from '@/features/transcripts/components/session-list'
import { ProjectStatsCards } from './components/project-stats-cards'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
} from '@/shared/components/page/page-header'

function decodeProjectName(encodedName: string): string {
  try {
    const decoded = encodedName.replace(/^-/, '/').replace(/-/g, '/')
    const parts = decoded.split('/').filter(Boolean)
    return parts.slice(-2).join('/')
  } catch {
    return encodedName
  }
}

export function Page() {
  const { sessions, stats } = Route.useLoaderData()
  const { projectId } = Route.useParams()

  const projectName = decodeProjectName(projectId)

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <div>
            <PageTitle>{projectName}</PageTitle>
            <PageDescription>
              Project efficiency and session history
            </PageDescription>
          </div>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6">
        {/* Efficiency statistics */}
        <ProjectStatsCards stats={stats} />

        {/* Sessions header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Sessions</h2>
          <span className="text-sm text-muted-foreground">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Session list */}
        <SessionList sessions={sessions} projectId={projectId} />
      </div>
    </>
  )
}