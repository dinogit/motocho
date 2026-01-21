import React, { useState, useMemo } from 'react'
import {Bot, Activity, Loader2, Wand2, Coins, MessageSquare, FileCode, Clock} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { getAgentTranscript } from '@/shared/services/transcripts/client'
import { MessageBlock } from '../message-block'
import type { Message } from '@/shared/types/transcripts'
import {StatItem} from "@/features/transcripts/components/session-card.tsx";
import {Badge} from "@/shared/components/ui/badge.tsx";
import {Status, StatusLabel} from "@/shared/components/ui/status.tsx";

interface AgentLaunchBlockProps {
    input: Record<string, any>
    projectId?: string
    sessionId?: string
    agentId?: string
}

const SUBAGENT_DESCRIPTIONS: Record<string, string> = {
    'general-purpose': 'General-purpose agent for complex multi-step tasks',
    'Explore': 'Fast agent for exploring codebases',
    'Plan': 'Software architect for designing implementation plans',
    'claude-code-guide': 'Agent for answering questions about Claude Code',
    'statusline-setup': 'Agent to configure status line settings',
    'code-simplifier': 'Agent for code simplification and refactoring',
    'engineer': 'General software engineering agent',
}

function getDisplayType(type: string) {
    if (type.includes(':')) {
        const [name, id] = type.split(':')
        if (name.toLowerCase() === id.toLowerCase()) return name
    }
    return type
}

interface TokenBreakdown {
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    totalTokens: number
    costUsd: number
}

interface ToolUsage {
    name: string
    count: number
}

interface AgentMetrics {
    messageCount: number
    durationMs: number
    tokenBreakdown: TokenBreakdown
    toolsUsed: ToolUsage[]
}

function calculateMetrics(messages: Message[]): AgentMetrics {
    const toolCountMap = new Map<string, number>()
    let inputTokens = 0
    let outputTokens = 0
    let cacheCreationTokens = 0
    let cacheReadTokens = 0
    let costUsd = 0
    let durationMs = 0

    // Extract detailed metrics
    messages.forEach((msg) => {
        // Aggregate token usage
        if (msg.usage) {
            inputTokens += msg.usage.inputTokens || 0
            outputTokens += msg.usage.outputTokens || 0
            cacheCreationTokens += msg.usage.cacheCreationTokens || 0
            cacheReadTokens += msg.usage.cacheReadTokens || 0
            costUsd += msg.usage.costUsd || 0
        }

        // Extract tools with counts
        msg.content?.forEach((block) => {
            if (block.type === 'tool_use' && block.name) {
                toolCountMap.set(block.name, (toolCountMap.get(block.name) || 0) + 1)
            }
        })
    })

    // Calculate duration from first and last message timestamps
    if (messages.length >= 2) {
        const firstTimestamp = messages[0].timestamp
        const lastTimestamp = messages[messages.length - 1].timestamp

        if (firstTimestamp && lastTimestamp) {
            const firstDate = new Date(firstTimestamp).getTime()
            const lastDate = new Date(lastTimestamp).getTime()
            durationMs = Math.max(0, lastDate - firstDate)
        }
    }

    // Convert tool map to sorted array
    const toolsUsed = Array.from(toolCountMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

    const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens

    return {
        messageCount: messages.length,
        durationMs,
        tokenBreakdown: {
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
            totalTokens,
            costUsd,
        },
        toolsUsed,
    }
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
}

export function AgentLaunchBlock({ input, projectId, sessionId, agentId: propsAgentId }: AgentLaunchBlockProps) {
    const [workshopActivity, setWorkshopActivity] = useState<Message[]>([])
    const [isLoadingWorkshop, setIsLoadingWorkshop] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [workshopError, setWorkshopError] = useState<string>('')

    const subagentType = String(input.subagent_type || 'unknown')
    const displayType = getDisplayType(subagentType)
    const description = SUBAGENT_DESCRIPTIONS[displayType] || SUBAGENT_DESCRIPTIONS[subagentType] || 'AI Agent'
    const agentTask = input.description
    const agentPrompt = input.prompt

    console.log('Agent Launch Block', { subagentType, projectId, sessionId })

    // Determine agentId - the agent that was invoked
    const effectiveAgentId = propsAgentId || (input as any).agentId

    // Calculate metrics from workshop activity
    const metrics = useMemo(() => {
        return calculateMetrics(workshopActivity)
    }, [workshopActivity])

    const handleViewWorkshop = async (id: string) => {
        if (!projectId || !sessionId) return
        setIsLoadingWorkshop(true)
        setIsSheetOpen(true)
        setWorkshopError('')
        try {
            const messages = await getAgentTranscript(projectId, sessionId, id)
            setWorkshopActivity(messages)
            console.log(`[agent-launch-block] Got ${messages.length} messages for agent ${id}`)
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            setWorkshopError(errorMsg)
            console.error(`[agent-launch-block] Error fetching agent transcript:`, errorMsg)
        } finally {
            setIsLoadingWorkshop(false)
        }
    }

    return (
        <div className="relative my-6 group">
            <div className="absolute -inset-0.5 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>

            <div className="relative bg-white dark:bg-zinc-950 border-2 border-sky-500/30 rounded-lg overflow-hidden flex flex-col shadow-lg shadow-sky-500/5">
                <div className="p-5 flex flex-col gap-6">
                    {/* Main Info */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                                <Bot className="h-7 w-7 text-sky-600" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                                    {displayType}
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                    "{description}"
                                </p>
                            </div>
                        </div>

                        {agentTask && (
                            <div className="space-y-2 pl-1 border-l-2 border-sky-500/10">
                                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest pl-2">Objective</span>
                                <p className="text-sm font-medium text-foreground pl-2">{String(agentTask)}</p>
                            </div>
                        )}

                        {agentPrompt && (
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Initialization Prompt</span>
                                    <Wand2 className="h-3 w-3 text-sky-400" />
                                </div>
                                <p className="text-xs font-mono text-muted-foreground/80 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                    {String(agentPrompt)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Area */}
                    <div className="w-full flex flex-col items-center justify-center gap-3 p-4 bg-sky-500/5 rounded-lg border border-sky-500/10 self-center md:self-stretch">
                        <div className="text-center space-y-1">
                            <p className="text-[10px] text-muted-foreground">Detailed activity logs are available for this sub-agent.</p>
                        </div>

                        {effectiveAgentId ? (
                            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button
                                        className="w-full bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-500/20 gap-2 h-10 font-bold text-xs"
                                        onClick={() => handleViewWorkshop(effectiveAgentId)}
                                    >
                                        <Activity className="h-4 w-4" />
                                        Agent Activity
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="sm:max-w-7xl w-full p-0 flex flex-col">
                                    <SheetHeader className="p-6 pb-3 space-y-4">
                                        <SheetTitle className="flex items-center gap-2">
                                            <Bot className="h-5 w-5 text-sky-500" />
                                            Agent Activity: {displayType}
                                        </SheetTitle>
                                        {!isLoadingWorkshop && !workshopError && metrics.messageCount > 0 && (
                                            <div className="flex items-center gap-3 flex-wrap pt-2">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <StatItem
                                                        icon={<FileCode className="h-4 w-4" />}
                                                        value={metrics.messageCount}
                                                        label="messages"
                                                        color="text-chart-1"
                                                    />
                                                    <StatItem
                                                        icon={<Clock className="h-4 w-4" />}
                                                        value={formatDuration(metrics.durationMs)}
                                                        label="minutes"
                                                        color="text-chart-1"
                                                    />
                                                    <StatItem
                                                        icon={<Coins className="h-4 w-4" />}
                                                        value={metrics.tokenBreakdown.inputTokens + metrics.tokenBreakdown.outputTokens}
                                                        label="tokens"
                                                        color="text-chart-1"
                                                    />

                                                    {metrics.toolsUsed.length > 0 && (
                                                        <>
                                                            {/*<span className="text-[11px]">*/}
                                                            {/*    tools: {metrics.toolsUsed.map(t => `${t.name}(${t.count})`).join(', ')}*/}
                                                            {/*</span>*/}
                                                            <span className="text-[11px]">
                                                                tools:
                                                            </span>
                                                            {metrics.toolsUsed.map(t => <><Status variant="info">
                                                                <StatusLabel>{t.name}({t.count})</StatusLabel>
                                                            </Status></>)}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </SheetHeader>
                                    <ScrollArea className="flex-1 px-6 pb-6 border-t overflow-scroll">
                                        {isLoadingWorkshop ? (
                                            <div className="flex items-center justify-center py-20">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : workshopError ? (
                                            <div className="text-center py-20 text-red-500">
                                                <p className="text-sm font-semibold">Error Loading Workshop Activity</p>
                                                <p className="text-xs mt-4 font-mono bg-red-50 dark:bg-red-950 p-3 rounded">{workshopError}</p>
                                            </div>
                                        ) : workshopActivity.length > 0 ? (
                                            <div className="space-y-6 pt-4">
                                                {workshopActivity.map((msg) => (
                                                    <MessageBlock key={msg.uuid} message={msg} projectId={projectId} sessionId={sessionId} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-20 text-muted-foreground">
                                                <p>No workshop activity recorded</p>
                                                <p className="text-[10px] mt-2">Agent: {effectiveAgentId}</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </SheetContent>
                            </Sheet>
                        ) : (
                            <div className="w-full space-y-2">
                                <Button
                                    disabled
                                    variant="outline"
                                    className="w-full border-dashed gap-2 h-10 text-[10px] text-muted-foreground flex items-center justify-center bg-zinc-50 dark:bg-zinc-900"
                                >
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    ID DISCOVERY IN PROGRESS
                                </Button>
                                <p className="text-[9px] text-muted-foreground text-center leading-tight px-2">
                                    Searching transcript for sub-agent identifier. Link will activate once identification appears in the log.
                                </p>
                            </div>
                        )}

                        {effectiveAgentId && (
                            <div className="flex items-center gap-1 opacity-50">
                                <span className="text-[9px] font-mono text-muted-foreground">ID: {effectiveAgentId.slice(0, 8)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
