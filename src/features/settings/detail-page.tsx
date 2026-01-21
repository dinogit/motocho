import { useLoaderData, useRouter, useNavigate } from '@tanstack/react-router'
import {
    PageDescription, PageHeader,
    PageHeaderContent,
    PageHeaderSeparator,
    PageTitle
} from "@/shared/components/page/page-header.tsx"
import { Button } from '@/shared/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { ClaudeSettingsCard } from './components/claude-settings-card'
import {
    getSettingsData,
    updateGlobalSettings,
    updateProjectSettings,
} from '@/shared/services/settings/client'

interface SettingsLoaderData {
    global: ClaudeSettings
    projects: Record<string, ProjectSettings>
    allProjects: { path: string; name: string }[]
}

import { toggleSkill } from '@/shared/services/skills/client'

import { toggleMcpServer } from '@/shared/services/mcp/client'
import { setModel, toggleThinking, clearModel } from '@/shared/services/settings/client'
import type { SettingsDashboardData, ClaudeSettings, ProjectSettings } from '@/shared/types/settings'
import type { SkillsDashboardData, Skill } from '@/shared/types/skills'
import type { McpDashboardData, McpServer } from '@/shared/types/mcp'

export function DetailPage() {
    const router = useRouter()
    const navigate = useNavigate()
    const { settings, skills, mcp, projectPath, projectName } = useLoaderData({ from: '/settings/$projectId', structuralSharing: false }) as {
        settings: SettingsDashboardData
        skills: SkillsDashboardData
        mcp: McpDashboardData
        projectPath: string
        projectName: string
    }

    // Find current project's skills and MCP servers
    const currentProject = skills.projects.find(p => p.projectPath === projectPath)
    const currentMcp = mcp.projects.find(p => p.projectPath === projectPath)

    const projectSkills = currentProject?.skills || []
    const projectMcpServers = currentMcp?.servers || []

    const handleModelChange = async (model: string) => {
        if (model === 'default') {
            await clearModel('project', projectPath)
        } else {
            await setModel(model, 'project', projectPath)
        }
        router.invalidate()
    }

    const handleThinkingToggle = async (enabled: boolean) => {
        await toggleThinking(enabled, 'global')
        router.invalidate()
    }

    const handleSkillToggle = async (skill: Skill, enabled: boolean) => {
        await toggleSkill(skill.path, enabled)
        router.invalidate()
    }

    const handleMcpToggle = async (server: McpServer, enabled: boolean) => {
        await toggleMcpServer(projectPath, server.name, enabled)
        router.invalidate()
    }

    const handleRefresh = async () => {
        router.invalidate()
    }

    const handleBack = () => {
        navigate({ to: '/settings' })
    }

    return (
        <>
            <PageHeader>

                <PageHeaderContent>
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <PageHeaderSeparator />
                    <PageTitle>{projectName}</PageTitle>
                    <PageHeaderSeparator />
                    <PageDescription>
                        Configure Claude Code settings for this project
                    </PageDescription>
                </PageHeaderContent>
            </PageHeader>
            <ClaudeSettingsCard
                projectPath={projectPath}
                currentModel={settings.projects?.[projectPath]?.model || settings.global?.model}
                thinkingEnabled={settings.global?.thinking || false}
                skills={projectSkills}
                mcpServers={projectMcpServers}
                onModelChange={handleModelChange}
                onThinkingToggle={handleThinkingToggle}
                onSkillToggle={handleSkillToggle}
                onMcpToggle={handleMcpToggle}
                onRefresh={handleRefresh}
            />
        </>
    )
}