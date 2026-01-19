import { useState, useEffect } from 'react'
import { ProjectList } from './components/project-list'
import { getProjects } from '@/shared/services/transcripts/client'
import type { Project } from '@/shared/types/transcripts'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'

export function Page() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects()
        setProjects(data)
      } catch (error) {
        console.error('Failed to load projects:', error)
        setProjects([])
      } finally {
        setIsLoading(false)
      }
    }

    loadProjects()
  }, [])

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Transcripts</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            Browse all your Claude Code projects
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-4 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Loading projects...</p>
          </div>
        ) : (
          <ProjectList projects={projects} />
        )}
      </div>
    </>
  )
}