/**
 * Project Sessions Route
 *
 * Route: /transcripts/$projectId
 *
 * Displays all sessions for a project with efficiency statistics:
 * - Project cost (total spent)
 * - Lines written (via Write/Edit tools)
 * - Time spent (Claude processing time)
 * - Session list with individual stats
 */

import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SessionList } from '@/features/transcripts/components/session-list'
import { ProjectStatsCards } from '@/features/projects/components/project-stats-cards'
import { getProjectStats, getProjectSessions } from '@/shared/services/transcripts/client'
import type { ProjectStats, Session } from '@/shared/services/transcripts/types'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
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

function PageComponent() {
  const { projectId } = Route.useParams()
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const projectName = decodeProjectName(projectId)

  useEffect(() => {
    async function loadProjectData() {
      try {
        const [sessionsData, statsData] = await Promise.all([
          getProjectSessions(projectId),
          getProjectStats(projectId),
        ])
        setSessions(sessionsData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load project data:', error)
        setSessions([])
        setStats(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [projectId])

  console.log({stats, projectName, sessions})

  if (isLoading) {
    return (
      <>
        <PageHeader>
          <PageHeaderContent>
            <div>
              <PageTitle>{projectName}</PageTitle>
              <PageDescription>Loading...</PageDescription>
            </div>
          </PageHeaderContent>
        </PageHeader>
      </>
    )
  }

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>{projectName}</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            Project efficiency and session history
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6">
        {/* Efficiency statistics */}
        {stats && <ProjectStatsCards stats={stats} />}

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

export const Route = createFileRoute('/transcripts/$projectId/')({
  component: PageComponent,
})
