import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/settings/page'
import type { SkillsDashboardData } from '@/shared/types/skills'
import type { McpDashboardData } from '@/shared/types/mcp'
import type { SettingsDashboardData } from '@/shared/types/settings'

export const Route = createFileRoute('/settings/')({
  loader: async () => {
    // Load skills and MCP data first
    const [skills, mcp] = await Promise.all([
      invoke<SkillsDashboardData>('get_skills_data'),
      invoke<McpDashboardData>('get_mcp_data'),
    ])

    // Get all projects
    const allProjects = (skills as any)?.allProjects || []

    // Load settings for each project
    const projectSettings = await Promise.all(
      allProjects.map((project: any) =>
        invoke<SettingsDashboardData>('get_settings_data', { projectPath: project.path })
      )
    )

    // Create object of project path -> settings (Map doesn't serialize to JSON)
    const settingsMap = Object.fromEntries(
      allProjects.map((project: any, index: number) => [project.path, projectSettings[index]])
    )

    return { skills, mcp, allProjects, settingsMap }
  },
  component: Page,
})