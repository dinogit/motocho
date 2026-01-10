import { createFileRoute } from '@tanstack/react-router'
import { DetailPage } from '@/features/settings/detail-page.tsx'
import { getSettingsData } from '@/shared/services/settings/client'
import { getSkillsData } from '@/shared/services/skills/client'
import { getMcpData } from '@/shared/services/mcp/client'

export const Route = createFileRoute('/settings/$projectId')({
  loader: async ({ params }) => {
    // Decode project path from URL
    const projectPath = atob(decodeURIComponent(params.projectId))

    // Load data for this specific project
    const [settings, skills, mcp] = await Promise.all([
      getSettingsData(projectPath),
      getSkillsData(),
      getMcpData(),
    ])

    // Get project name
    const project = skills.allProjects.find(p => p.path === projectPath)
    const projectName = project?.name || projectPath

    return { settings, skills, mcp, projectPath, projectName }
  },
  component: DetailPage,
})
