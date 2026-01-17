import { useState } from 'react'
import { Bot, Activity, Loader2, Wand2 } from 'lucide-react'
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

export function AgentLaunchBlock({ input, projectId, sessionId, agentId: propsAgentId }: AgentLaunchBlockProps) {
    const [workshopActivity, setWorkshopActivity] = useState<Message[]>([])
    const [isLoadingWorkshop, setIsLoadingWorkshop] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    const subagentType = String(input.subagent_type || 'unknown')
    const displayType = getDisplayType(subagentType)
    const description = SUBAGENT_DESCRIPTIONS[displayType] || SUBAGENT_DESCRIPTIONS[subagentType] || 'AI Agent'
    const agentTask = input.description
    const agentPrompt = input.prompt

    console.log('Agent Launch Block', { subagentType, projectId, sessionId })

    // Determine agentId - the agent that was invoked
    const effectiveAgentId = propsAgentId || (input as any).agentId

    const handleViewWorkshop = async (id: string) => {
        if (!projectId || !sessionId) return
        setIsLoadingWorkshop(true)
        setIsSheetOpen(true)
        try {
            const messages = await getAgentTranscript(projectId, sessionId, id)
            setWorkshopActivity(messages)
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
                            <span className="text-[9px] font-bold text-sky-500/60 uppercase tracking-tighter">Workshop Flow</span>
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
                                        View Workshop Activity
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col">
                                    <SheetHeader className="p-6 pb-2">
                                        <SheetTitle className="flex items-center gap-2">
                                            <Bot className="h-5 w-5 text-sky-500" />
                                            Workshop Activity: {displayType}
                                        </SheetTitle>
                                    </SheetHeader>
                                    <ScrollArea className="flex-1 px-6 pb-6 border-t">
                                        {isLoadingWorkshop ? (
                                            <div className="flex items-center justify-center py-20">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
