import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Coins,
    Cpu,
    RefreshCw,
    Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import type { SessionHealth } from "@/shared/types/transcripts"
import { cn } from "@/shared/lib/utils"
import { getDiagnosis } from "@/features/sessions/lib/diagnosis"

interface UserHealthCardProps {
    health: SessionHealth
    toolBreakdown?: Record<string, number>
}

export function UserHealthCard({ health, toolBreakdown }: UserHealthCardProps) {
    const sortedTools = toolBreakdown ? Object.entries(toolBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({
            name: name.replace('mcp__', '').replace(/-mcp__/, ' '),
            count
        }))
        .filter(t => t.count > 0)
        : []

    const getStatusColor = (status: string) => {
        switch (status) {
            case "healthy":
                return "text-green-500 bg-green-500/10 border-green-500/20"
            case "stalled":
                return "text-amber-500 bg-amber-500/10 border-amber-500/20"
            case "frantic":
                return "text-red-500 bg-red-500/10 border-red-500/20"
            case "looping":
                return "text-red-500 bg-red-500/10 border-red-500/20"
            case "exploding":
                return "text-destructive bg-destructive/10 border-destructive/20"
            case "expensive":
                return "text-amber-500 bg-amber-500/10 border-amber-500/20"
            case "heavy":
                return "text-amber-500 bg-amber-500/10 border-amber-500/20"
            default:
                return "text-muted-foreground bg-muted/50 border-border"
        }
    }

    const getVerdictStyle = (verdict: string) => {
        switch (verdict) {
            case "continue":
                return "bg-green-500 text-white"
            case "constrain":
                return "bg-amber-500 text-white"
            case "restart":
                return "bg-destructive text-white"
            default:
                return "bg-muted text-muted-foreground"
        }
    }

    return (
        <Card className="mb-6 border-l-4 border-l-primary/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Session Diagnostics</CardTitle>
                    <span
                        className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider",
                            getStatusColor(health.status),
                        )}
                    >
                        {health.status}
                    </span>
                </div>
                <div className={cn("px-3 py-1 rounded text-sm font-bold uppercase", getVerdictStyle(health.verdict))}>
                    {health.verdict}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricItem
                        label="Prompts / Hour"
                        value={health.promptsPerHour.toFixed(1)}
                        subtext="Cognitive Load"
                        icon={<Clock className="h-4 w-4" />}
                        status={
                            health.promptsPerHour > 20
                                ? "danger"
                                : health.promptsPerHour < 2
                                    ? "warning"
                                    : "good"
                        }
                        description="Prompts per hour. >20 indicates panic/frantic behavior. <2 indicates stalling."
                    />
                    <MetricItem
                        label="Tools / Prompt"
                        value={health.toolCallsPerPrompt.toFixed(1)}
                        subtext="Execution Density"
                        icon={<Cpu className="h-4 w-4" />}
                        status={health.toolCallsPerPrompt > 8 ? "danger" : "good"}
                        description="Tool calls per prompt. >8 suggests looping or flailing without progress."
                    />
                    <MetricItem
                        label="Assistant / Pro..."
                        value={health.assistantMessagesPerPrompt.toFixed(1)}
                        subtext="Message Explosion"
                        icon={<Zap className="h-4 w-4" />}
                        status={health.assistantMessagesPerPrompt > 5 ? "danger" : "good"}
                        description="Assistant messages per prompt. >5 indicates context poisoning or apology loops."
                    />
                    <MetricItem
                        label="Tokens / Min"
                        value={`${(health.tokensPerMinute / 1000).toFixed(1)}k`}
                        subtext="Quota Burn"
                        icon={<Coins className="h-4 w-4" />}
                        status={health.tokensPerMinute > 50000 ? "warning" : "good"}
                        description="Tokens processed per minute. >50k is heavy load."
                    />
                </div>

                {/* Activity Breakdown */}
                {sortedTools.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Activity Summary</h4>
                        <div className="flex flex-wrap gap-2">
                            {sortedTools.slice(0, 8).map((tool) => (
                                <div key={tool.name} className="text-xs bg-muted/50 px-2 py-1 rounded border border-border/50 flex items-center gap-1.5">
                                    <span className="font-medium text-foreground">{tool.name}</span>
                                    <span className="bg-background/80 px-1 rounded text-[10px] min-w-[1.2em] text-center font-mono">{tool.count}</span>
                                </div>
                            ))}
                            {sortedTools.length > 8 && (
                                <span className="text-xs text-muted-foreground self-center">+{sortedTools.length - 8} more</span>
                            )}
                        </div>
                    </div>
                )}

                {(() => {
                    const diagnosis = getDiagnosis(health, toolBreakdown);
                    if (!diagnosis) return null;

                    return (
                        <div className="mt-4 pt-4 border-t border-border">
                            <div className="bg-muted/30 rounded-lg p-3 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{diagnosis.title}</span>
                                </div>
                                <p className="text-muted-foreground mb-2">{diagnosis.description}</p>
                                <div className="flex gap-2 text-xs bg-background/50 p-2 rounded border border-border/50">
                                    <span className="font-semibold text-primary">Tip:</span>
                                    <span>{diagnosis.tip}</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </CardContent>
        </Card>
    )
}

function MetricItem({
    label,
    value,
    subtext,
    icon,
    status,
    description,
}: {
    label: string
    value: string
    subtext: string
    icon: React.ReactNode
    status: "good" | "warning" | "danger"
    description?: string
}) {
    const getColor = () => {
        switch (status) {
            case "good":
                return "text-foreground"
            case "warning":
                return "text-amber-500"
            case "danger":
                return "text-destructive"
            default:
                return "text-foreground"
        }
    }

    const getIconColor = () => {
        switch (status) {
            case "good":
                return "text-muted-foreground"
            case "warning":
                return "text-amber-500"
            case "danger":
                return "text-destructive"
            default:
                return "text-muted-foreground"
        }
    }

    return (
        <div className="flex flex-col gap-1 p-3 bg-muted/30 rounded-lg border border-border/50 group relative">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{label}</span>
                <span className={getIconColor()}>{icon}</span>
            </div>
            <div className={cn("text-2xl font-bold tracking-tight", getColor())}>{value}</div>
            <div className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-wider">{subtext}</div>

            {/* Tooltip on hover */}
            {description && (
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border w-48 text-center pointer-events-none z-50">
                    {description}
                </div>
            )}
        </div>
    )
}
