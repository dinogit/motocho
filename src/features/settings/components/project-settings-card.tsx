import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Brain, Sparkles, Wrench, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface ProjectSettingsCardProps {
    projectPath: string
    projectName: string
    model?: string
    thinkingEnabled: boolean
    enabledSkillsCount: number
    totalSkillsCount: number
    enabledMcpCount: number
    totalMcpCount: number
    onClick: () => void
}

const MODEL_DISPLAY: Record<string, string> = {
    'opus': 'Claude Opus 4.5',
    'sonnet': 'Claude Sonnet 4.5',
    'haiku': 'Claude Haiku 3.5',
}

export function ProjectSettingsCard({
    projectPath,
    projectName,
    model,
    thinkingEnabled,
    enabledSkillsCount,
    totalSkillsCount,
    enabledMcpCount,
    totalMcpCount,
    onClick,
}: ProjectSettingsCardProps) {
    const displayModel = model ? (MODEL_DISPLAY[model] || model) : 'Default'

    return (
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">{projectName}</CardTitle>
                        <CardDescription className="truncate text-xs mt-1">
                            {projectPath}
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Model */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        <span>Model</span>
                    </div>
                    <Badge variant="outline">{displayModel}</Badge>
                </div>

                {/* Extended Thinking */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Brain className="h-4 w-4" />
                        <span>Extended Thinking</span>
                    </div>
                    <Badge variant={thinkingEnabled ? "default" : "secondary"}>
                        {thinkingEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                </div>

                {/* Skills */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Wrench className="h-4 w-4" />
                        <span>Skills</span>
                    </div>
                    <Badge variant="outline">
                        {enabledSkillsCount}/{totalSkillsCount} enabled
                    </Badge>
                </div>

                {/* MCP Tools */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Wrench className="h-4 w-4" />
                        <span>MCP Tools</span>
                    </div>
                    <Badge variant="outline">
                        {enabledMcpCount}/{totalMcpCount} enabled
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}