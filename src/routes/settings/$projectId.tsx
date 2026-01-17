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

    // Load data for this specific project
    const [settings, skills, mcp] = await Promise.all([
      invoke<SettingsDashboardData>('get_settings_data', { projectPath }),
      invoke<SkillsDashboardData>('get_skills_data'),
      invoke<McpDashboardData>('get_mcp_data'),
    ])

    // Get project name
    const project = (skills as any)?.allProjects.find((p: any) => p.path === projectPath)
    const projectName = project?.name || projectPath

    return { settings, skills, mcp, projectPath, projectName }
  },
  component: DetailPage,
})
