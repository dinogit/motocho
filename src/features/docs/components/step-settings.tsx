'use client'

import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Loader2, Sparkles, Plug, Bot, Wrench, EyeOff, Code, Briefcase } from 'lucide-react'
import { useDocs } from '../context/docs-context'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group'
import { cn } from '@/shared/lib/utils'

// ============================================================================
// Types matching Rust backend structs
// ============================================================================

interface RustSkill {
    name: string
    description: string
    content: string
    path: string
    enabled: boolean
}

interface RustProjectSkillsConfig {
    projectPath: string
    projectName: string
    claudeMd: string | null
    skills: RustSkill[]
}

interface SkillsDashboardData {
    projects: RustProjectSkillsConfig[]
    allProjects: { path: string; name: string }[]
    stats: {
        totalProjects: number
        projectsWithClaudeMd: number
        projectsWithSkills: number
        totalSkills: number
    }
}

interface RustMcpServer {
    name: string
    serverType: string
    url?: string
    command?: string
    args?: string[]
    disabled?: boolean
}

interface RustMcpPlugin {
    id: string
    name: string
    description?: string
    serverConfig: Record<string, { type: string; command?: string }>
    isInstalled: boolean
    activeInProjects: string[]
}

interface McpDashboardData {
    projects: {
        projectPath: string
        projectName: string
        servers: RustMcpServer[]
    }[]
    allProjects: { path: string; name: string }[]
    plugins: RustMcpPlugin[]
    globalServers: RustMcpServer[]
    stats: {
        totalServers: number
        projectsWithMcp: number
    }
}

interface RustAgent {
    name: string
    description: string
    tools: string[]
    skills: string[]
    mcpServers: string[]
    model: string
    content: string
    path: string
    agentType: string
    pluginName?: string
}

interface AgentsDashboardData {
    userAgents: RustAgent[]
    pluginAgents: RustAgent[]
}

// ============================================================================
// Helper resource type for display
// ============================================================================

interface HelperResource {
    id: string
    type: 'skill' | 'agent' | 'mcp'
    name: string
    description: string
    content: string
}

// ============================================================================
// Audience presets
// ============================================================================

type Audience = 'engineer' | 'business' | 'agent'

const AUDIENCE_PROMPTS: Record<Audience, string> = {
    engineer: `Generate technical documentation from the selected sessions.

Include:
- Architecture overview and design decisions
- API references and code examples
- Setup and installation instructions
- Key patterns and conventions used
- Configuration options

Format as clean markdown suitable for technical documentation.`,

    business: `Generate a business-focused summary from the selected sessions.

Include:
- Executive summary of what was built
- Key features and capabilities
- Business value and benefits
- High-level workflow descriptions
- No code snippets - focus on outcomes

Format as clean markdown suitable for stakeholder communication.`,

    agent: `Generate a CLAUDE.md context file from the selected sessions.

Include:
- Project purpose and goals
- Architecture overview
- Key files and their purposes
- Patterns and conventions to follow
- Important constraints and decisions
- Commands for development, testing, building

Format as a CLAUDE.md file that helps future AI assistants understand this project.`,
}

const AUDIENCE_OPTIONS = [
    { value: 'engineer' as Audience, label: 'Engineer', icon: Code, description: 'Technical docs with code examples' },
    { value: 'business' as Audience, label: 'Business', icon: Briefcase, description: 'Executive summary, no code' },
    { value: 'agent' as Audience, label: 'AI Agent', icon: Bot, description: 'CLAUDE.md for future AI' },
]

export function StepSettings() {
    const { state, dispatch } = useDocs()
    const { customPrompt } = state

    const [isLoading, setIsLoading] = useState(true)
    const [helpers, setHelpers] = useState<HelperResource[]>([])
    const [selectedHelper, setSelectedHelper] = useState<HelperResource | null>(null)
    const [showPreview, setShowPreview] = useState(false)
    const [audience, setAudience] = useState<Audience>('engineer')

    // Initialize prompt with default if empty
    useEffect(() => {
        if (!customPrompt) {
            dispatch({ type: 'SET_CUSTOM_PROMPT', payload: AUDIENCE_PROMPTS.engineer })
        }
    }, [customPrompt, dispatch])

    // Load helper resources on mount
    useEffect(() => {
        async function loadHelpers() {
            setIsLoading(true)
            try {
                const [skillsData, mcpData, agentsData] = await Promise.all([
                    invoke<SkillsDashboardData>('get_skills_data'),
                    invoke<McpDashboardData>('get_mcp_data'),
                    invoke<AgentsDashboardData>('get_agents_data'),
                ])

                const resources: HelperResource[] = []

                // Extract skills
                for (const project of skillsData.projects) {
                    for (const skill of project.skills) {
                        resources.push({
                            id: `skill-${skill.name}`,
                            type: 'skill',
                            name: skill.name,
                            description: skill.description,
                            content: skill.content,
                        })
                    }
                }

                // Extract agents
                for (const agent of [...agentsData.userAgents, ...agentsData.pluginAgents]) {
                    resources.push({
                        id: `agent-${agent.name}`,
                        type: 'agent',
                        name: agent.name,
                        description: agent.description,
                        content: agent.content,
                    })
                }

                // Extract MCP servers (limited info, but can be referenced)
                for (const server of mcpData.globalServers) {
                    resources.push({
                        id: `mcp-${server.name}`,
                        type: 'mcp',
                        name: server.name,
                        description: server.command ?? 'MCP Server',
                        content: `MCP Server: ${server.name}\nCommand: ${server.command ?? 'N/A'}`,
                    })
                }

                setHelpers(resources)
            } catch (error) {
                console.error('Failed to load helpers:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadHelpers()
    }, [])

    const handleAudienceChange = (value: string) => {
        if (value) {
            const newAudience = value as Audience
            setAudience(newAudience)
            dispatch({ type: 'SET_AUDIENCE', payload: newAudience })
            dispatch({ type: 'SET_CUSTOM_PROMPT', payload: AUDIENCE_PROMPTS[newAudience] })
        }
    }

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch({ type: 'SET_CUSTOM_PROMPT', payload: e.target.value })
    }

    const handleHelperClick = (helper: HelperResource) => {
        if (selectedHelper?.id === helper.id) {
            setSelectedHelper(null)
            setShowPreview(false)
        } else {
            setSelectedHelper(helper)
            setShowPreview(true)
        }
    }

    const getHelperIcon = (type: HelperResource['type']) => {
        switch (type) {
            case 'skill':
                return Sparkles
            case 'agent':
                return Bot
            case 'mcp':
                return Plug
            default:
                return Wrench
        }
    }

    const groupedHelpers = {
        skills: helpers.filter(h => h.type === 'skill'),
        agents: helpers.filter(h => h.type === 'agent'),
        mcp: helpers.filter(h => h.type === 'mcp'),
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Tabs defaultValue="prompt" className="space-y-4">
            <TabsList>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
                <TabsTrigger value="helpers">Helpers</TabsTrigger>
            </TabsList>

            {/* Prompt Tab */}
            <TabsContent value="prompt" className="space-y-6">
                {/* Audience Selection */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Target Audience</Label>
                    <ToggleGroup
                        type="single"
                        value={audience}
                        onValueChange={handleAudienceChange}
                        className="justify-start"
                    >
                        {AUDIENCE_OPTIONS.map((option) => (
                            <ToggleGroupItem
                                key={option.value}
                                value={option.value}
                                aria-label={option.label}
                                className="gap-2 px-4"
                            >
                                <option.icon className="h-4 w-4" />
                                {option.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <p className="text-sm text-muted-foreground">
                        {AUDIENCE_OPTIONS.find(o => o.value === audience)?.description}
                    </p>
                </div>

                {/* Prompt */}
                <div className="space-y-3">
                    <Label htmlFor="prompt" className="text-sm font-medium">
                        Generation Prompt
                    </Label>
                    <Textarea
                        id="prompt"
                        value={customPrompt}
                        onChange={handlePromptChange}
                        className="min-h-[200px] font-mono text-sm"
                        placeholder="Describe what you want to extract from the sessions..."
                    />
                </div>
            </TabsContent>

            {/* Helpers Tab */}
            <TabsContent value="helpers" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Click to preview — use as reference for your prompt
                </p>

                {helpers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No helpers available
                    </p>
                ) : (
                    <div className="space-y-4">
                        {/* Skills */}
                        {groupedHelpers.skills.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Sparkles className="h-3 w-3" />
                                    Skills ({groupedHelpers.skills.length})
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {groupedHelpers.skills.map((helper) => {
                                        const Icon = getHelperIcon(helper.type)
                                        const isSelected = selectedHelper?.id === helper.id
                                        return (
                                            <button
                                                key={helper.id}
                                                onClick={() => handleHelperClick(helper)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors",
                                                    isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-muted/50"
                                                )}
                                            >
                                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{helper.name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Agents */}
                        {groupedHelpers.agents.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Bot className="h-3 w-3" />
                                    Agents ({groupedHelpers.agents.length})
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {groupedHelpers.agents.map((helper) => {
                                        const Icon = getHelperIcon(helper.type)
                                        const isSelected = selectedHelper?.id === helper.id
                                        return (
                                            <button
                                                key={helper.id}
                                                onClick={() => handleHelperClick(helper)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors",
                                                    isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-muted/50"
                                                )}
                                            >
                                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{helper.name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* MCP */}
                        {groupedHelpers.mcp.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Plug className="h-3 w-3" />
                                    MCP Servers ({groupedHelpers.mcp.length})
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {groupedHelpers.mcp.map((helper) => {
                                        const Icon = getHelperIcon(helper.type)
                                        const isSelected = selectedHelper?.id === helper.id
                                        return (
                                            <button
                                                key={helper.id}
                                                onClick={() => handleHelperClick(helper)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors",
                                                    isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-muted/50"
                                                )}
                                            >
                                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{helper.name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Preview Panel */}
                        {selectedHelper && showPreview && (
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const Icon = getHelperIcon(selectedHelper.type)
                                            return <Icon className="h-4 w-4" />
                                        })()}
                                        <span className="font-medium">{selectedHelper.name}</span>
                                        <span className="text-xs text-muted-foreground">({selectedHelper.type})</span>
                                    </div>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <EyeOff className="h-4 w-4" />
                                    </button>
                                </div>
                                {selectedHelper.description && (
                                    <p className="text-sm text-muted-foreground">{selectedHelper.description}</p>
                                )}
                                <pre className="text-xs bg-background rounded p-3 overflow-auto max-h-[200px] whitespace-pre-wrap">
                                    {selectedHelper.content}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    )
}
