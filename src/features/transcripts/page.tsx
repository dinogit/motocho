import { Route } from '@/routes/transcripts/index.tsx'
import { ProjectList } from './components/project-list'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
} from '@/shared/components/page/page-header'

export function Page() {
  const projects = Route.useLoaderData()

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <div>
            <PageTitle>Transcripts</PageTitle>
            <PageDescription>
              Browse all your Claude Code projects
            </PageDescription>
          </div>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-4 p-6">
        <ProjectList projects={projects} />
      </div>
    </>
  )
}