import { useLoaderData, useNavigate } from '@tanstack/react-router'
import {
    PageDescription, PageHeader,
    PageHeaderContent,
    PageHeaderSeparator,
    PageTitle
} from "@/shared/components/page/page-header.tsx"
import { ProjectSettingsCard } from './components/project-settings-card'
import type { SettingsDashboardData } from '@/shared/types/settings'
import type { SkillsDashboardData } from '@/shared/types/skills'
import type { McpDashboardData } from '@/shared/types/mcp'

export function Page() {
    const navigate = useNavigate()
    const { skills, mcp, allProjects, settingsMap } = useLoaderData({ from: '/settings/', structuralSharing: false }) as {
        skills: SkillsDashboardData
        mcp: McpDashboardData
        allProjects: Array<{ path: string; name: string }>
        settingsMap: Record<string, SettingsDashboardData>
    }

    const handleProjectClick = (projectPath: string) => {
        // Encode project path for URL
        const encodedPath = encodeURIComponent(btoa(projectPath))
        navigate({ to: `/settings/${encodedPath}` })
    }

    return (
        <>
            <PageHeader>
                <PageHeaderContent>
                    <PageTitle>
                        Settings
                    </PageTitle>
                    <PageHeaderSeparator />
                    <PageDescription>
                        Configure Claude Code settings for each project
                    </PageDescription>
                </PageHeaderContent>
            </PageHeader>
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {allProjects.map((project) => {
                        // Find project skills and MCP data
                        const projectSkills = skills.projects.find(p => p.projectPath === project.path)
                        const projectMcp = mcp.projects.find(p => p.projectPath === project.path)

                        const totalSkills = projectSkills?.skills.length || 0
                        const enabledSkills = projectSkills?.skills.filter(s => s.enabled).length || 0
                        const totalMcp = projectMcp?.servers.length || 0
                        const enabledMcp = projectMcp?.servers.filter(s => !s.disabled).length || 0

                        // Get project-specific settings
                        const projectSettings = settingsMap[project.path]
                        const model = projectSettings?.projects?.[project.path]?.model || projectSettings?.global?.model
                        const thinkingEnabled = projectSettings?.global?.thinking ?? false

                        return (
                            <ProjectSettingsCard
                                key={project.path}
                                projectPath={project.path}
                                projectName={project.name}
                                model={model}
                                thinkingEnabled={thinkingEnabled}
                                enabledSkillsCount={enabledSkills}
                                totalSkillsCount={totalSkills}
                                enabledMcpCount={enabledMcp}
                                totalMcpCount={totalMcp}
                                onClick={() => handleProjectClick(project.path)}
                            />
                        )
                    })}
                </div>
            </div>
        </>
    )
}