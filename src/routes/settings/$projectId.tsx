import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { DetailPage } from '@/features/settings/detail-page'
import type { SettingsDashboardData } from '@/shared/types/settings'
import type { SkillsDashboardData } from '@/shared/types/skills'
import type { McpDashboardData } from '@/shared/types/mcp'

function decodeProjectPath(encoded: string): string {
  return atob(decodeURIComponent(encoded))
}

export const Route = createFileRoute('/settings/$projectId')({
  loader: async ({ params }) => {
    // Decode project path from URL
    const projectPath = decodeProjectPath(params.projectId)

    // Load data for this specific project with error handling
    const [settings, skills, mcp] = await Promise.all([
      invoke<SettingsDashboardData>('get_settings_data', { projectPath }).catch((error) => {
        console.error(`Failed to load settings for ${projectPath}:`, error)
        return {
          global: {},
          projects: {},
          allProjects: []
        } as SettingsDashboardData
      }),
      invoke<SkillsDashboardData>('get_skills_data').catch((error) => {
        console.error('Failed to load skills data:', error)
        return { globalSkills: [], projects: [], allProjects: [] } as SkillsDashboardData
      }),
      invoke<McpDashboardData>('get_mcp_data').catch((error) => {
        console.error('Failed to load MCP data:', error)
        return { globalServers: [], projects: [], allProjects: [] } as McpDashboardData
      }),
    ])

    // Get project name
    const project = (skills as any)?.allProjects?.find((p: any) => p.path === projectPath)
    const projectName = project?.name || projectPath

    return { settings, skills, mcp, projectPath, projectName }
  },
  component: DetailPage,
})
