import { useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import { Badge } from '@/shared/components/ui/badge'
import { Label } from '@/shared/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'
import { Loader2, RefreshCw, Brain, Sparkles, Wrench } from 'lucide-react'
import type { Skill } from '@/shared/services/skills/types'
import type { McpServer } from '@/shared/services/mcp/types'

interface ClaudeSettingsCardProps {
    projectPath: string
    currentModel: string | undefined
    thinkingEnabled: boolean
    skills: Skill[]
    mcpServers: McpServer[]
    onModelChange: (model: string) => Promise<void>
    onThinkingToggle: (enabled: boolean) => Promise<void>
    onSkillToggle: (skill: Skill, enabled: boolean) => Promise<void>
    onMcpToggle: (server: McpServer, enabled: boolean) => Promise<void>
    onRefresh: () => Promise<void>
}

const MODELS = [
    { value: 'opus', label: 'Claude Opus 4.5', description: 'Most capable' },
    { value: 'sonnet', label: 'Claude Sonnet 4.5', description: 'Balanced' },
    { value: 'haiku', label: 'Claude Haiku 3.5', description: 'Fastest' },
]

export function ClaudeSettingsCard({
    projectPath,
    currentModel,
    thinkingEnabled,
    skills,
    mcpServers,
    onModelChange,
    onThinkingToggle,
    onSkillToggle,
    onMcpToggle,
    onRefresh,
}: ClaudeSettingsCardProps) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleModelChange = async (model: string) => {
        setLoading('model')
        try {
            await onModelChange(model)
        } finally {
            setLoading(null)
        }
    }

    const handleThinkingToggle = async (enabled: boolean) => {
        setLoading('thinking')
        try {
            await onThinkingToggle(enabled)
        } finally {
            setLoading(null)
        }
    }

    const handleSkillToggle = async (skill: Skill, enabled: boolean) => {
        setLoading(`skill-${skill.name}`)
        try {
            await onSkillToggle(skill, enabled)
        } finally {
            setLoading(null)
        }
    }

    const handleMcpToggle = async (server: McpServer, enabled: boolean) => {
        setLoading(`mcp-${server.name}`)
        try {
            await onMcpToggle(server, enabled)
        } finally {
            setLoading(null)
        }
    }

    const handleRefresh = async () => {
        setLoading('refresh')
        try {
            await onRefresh()
        } finally {
            setLoading(null)
        }
    }

    const enabledSkills = skills.filter(s => s.enabled)
    const enabledMcp = mcpServers.filter(s => !s.disabled)

    return (
        <Card className="border-none shadow-none p-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Claude Code Settings</CardTitle>
                    <CardDescription>
                        Control model, thinking, skills, and MCP tools for this project
                    </CardDescription>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={loading === 'refresh'}
                >
                    {loading === 'refresh' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                </Button>
            </CardHeader>
            <CardContent className="space-y-6 w-full">
                {/* Project Path */}
                <div className="text-sm text-muted-foreground">
                    <code className="bg-muted px-2 py-1 rounded text-xs">{projectPath}</code>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <Label>Model</Label>
                    </div>
                    <Select
                        value={currentModel || 'default'}
                        onValueChange={handleModelChange}
                        disabled={loading === 'model'}
                    >
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">
                                <span className="text-muted-foreground">Default (from plan)</span>
                            </SelectItem>
                            {MODELS.map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                    <div className="flex items-center gap-2">
                                        <span>{model.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {model.description}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Extended Thinking */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <Label>Extended Thinking</Label>
                            <p className="text-xs text-muted-foreground">
                                Enable deeper reasoning (uses more tokens)
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={thinkingEnabled}
                        onCheckedChange={handleThinkingToggle}
                        disabled={loading === 'thinking'}
                    />
                </div>

                {/* Skills Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <Label>Skills</Label>
                        <Badge variant="outline" className="ml-auto">
                            {enabledSkills.length} enabled
                        </Badge>
                    </div>

                    {skills.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No skills configured</p>
                    ) : (
                        <div className="space-y-2">
                            {skills.map((skill) => (
                                <div
                                    key={skill.path}
                                    className="flex items-center justify-between py-2 px-3 border rounded-lg"
                                >
                                    <div className="flex flex-col">
                                        <div className="font-medium text-sm truncate">
                                            {skill.name}
                                        </div>
                                        {skill.description && (
                                            <div className="text-xs text-muted-foreground whitespace-break-spaces max-w-[80%] truncate">
                                                {skill.description}
                                            </div>
                                        )}
                                    </div>
                                    <Switch
                                        checked={skill.enabled}
                                        onCheckedChange={(enabled) => handleSkillToggle(skill, enabled)}
                                        disabled={loading === `skill-${skill.name}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MCP Tools Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <Label>MCP Tools</Label>
                        <Badge variant="outline" className="ml-auto">
                            {enabledMcp.length} enabled
                        </Badge>
                    </div>

                    {mcpServers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No MCP servers configured</p>
                    ) : (
                        <div className="space-y-2">
                            {mcpServers.map((server) => (
                                <div
                                    key={server.name}
                                    className="flex items-center justify-between py-2 px-3 border rounded-lg"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {server.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {server.type}
                                            {server.type === 'http' && server.url && (
                                                <span className="ml-1 truncate">• {server.url}</span>
                                            )}
                                        </div>
                                    </div>
                                    <Switch
                                        checked={!server.disabled}
                                        onCheckedChange={(enabled) => handleMcpToggle(server, enabled)}
                                        disabled={loading === `mcp-${server.name}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <div className="font-medium mb-2">Context Impact</div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>Skills: ~{enabledSkills.length * 2}k tokens</div>
                        <div>MCP: ~{enabledMcp.length * 0.6}k tokens</div>
                    </div>
                    <p className="mt-2 text-xs">
                        Disable unused skills/MCP to reduce context usage per request.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}