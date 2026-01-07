import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/settings/page.tsx'
import { getSettingsData } from '@/shared/services/settings/server-functions'
import { getSkillsData } from '@/shared/services/skills/server-functions'
import { getMcpData } from '@/shared/services/mcp/server-functions'

export const Route = createFileRoute('/settings/')({
  loader: async () => {
    // Load skills and MCP data first
    const [skills, mcp] = await Promise.all([
      getSkillsData(),
      getMcpData(),
    ])

    // Get all projects
    const allProjects = skills.allProjects

    // Load settings for each project
    const projectSettings = await Promise.all(
      allProjects.map(project =>
        getSettingsData({ data: { projectPath: project.path } })
      )
    )

    // Create object of project path -> settings (Map doesn't serialize to JSON)
    const settingsMap = Object.fromEntries(
      allProjects.map((project, index) => [project.path, projectSettings[index]])
    )

    return { skills, mcp, allProjects, settingsMap }
  },
  component: Page,
})