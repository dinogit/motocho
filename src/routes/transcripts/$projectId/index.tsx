import { createFileRoute } from '@tanstack/react-router'
import { ProjectPage } from '@/features/transcripts/project-page'
import { getCodexProjectSessions, getCodexProjects, getProjectSessions, getProjects } from '@/shared/services/transcripts/client'

type SourceType = 'code' | 'codex'

export const Route = createFileRoute('/transcripts/$projectId/')({
  validateSearch: (search: Record<string, unknown>) => {
    const source = search.source === 'codex' ? 'codex' : 'code'
    return { source }
  },
  loaderDeps: ({ search }) => ({ source: search.source as SourceType }),
  loader: async ({ params, deps }) => {
    const source = deps.source
    const [codeProjects, codexProjects] = await Promise.all([getProjects(), getCodexProjects()])

    const codeProject = codeProjects.find((p) => p.id === params.projectId)
    const codexProject = codexProjects.find((p) => p.id === params.projectId)

    const projectPath = codeProject?.path || codexProject?.path || params.projectId
    const matchingCodexProject = codexProjects.find((p) => p.path === projectPath)
    const matchingCodeProject = codeProjects.find((p) => p.path === projectPath)

    const [codeSessions, codexSessions] = await Promise.all([
      matchingCodeProject ? getProjectSessions(matchingCodeProject.id) : Promise.resolve([]),
      matchingCodexProject ? getCodexProjectSessions(matchingCodexProject.id) : Promise.resolve([]),
    ])

    const sessions = [
      ...codeSessions.map((s) => ({ ...s, source: 'code' as const })),
      ...codexSessions.map((s) => ({ ...s, source: 'codex' as const })),
    ].sort((a, b) => Number(b.lastModified) - Number(a.lastModified))

    const displayName =
      matchingCodeProject?.displayName ||
      matchingCodexProject?.displayName ||
      (source === 'codex' ? 'Codex Project' : 'Code Project')

    const lastModified = sessions.length > 0
      ? sessions.reduce((max, s) => (Number(s.lastModified) > Number(max) ? s.lastModified : max), sessions[0].lastModified)
      : new Date(0)

    const project = {
      id: params.projectId,
      displayName,
      path: projectPath,
      sessionCount: sessions.length,
      lastModified,
      source: matchingCodeProject && matchingCodexProject ? 'both' : source,
    }

    return { project, sessions, source: project.source }
  },
  component: ProjectPage,
})
