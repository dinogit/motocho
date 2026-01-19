import { Activity, Bot, ChevronRight } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { ClientOnly } from '@/shared/components/client-only'

interface StandaloneProgressBlockProps {
    text: string
    agentId?: string
    timestamp?: string
    toolUseID?: string
}

export function StandaloneProgressBlock({ text, agentId, timestamp, toolUseID }: StandaloneProgressBlockProps) {
    const colorClass = 'bg-violet-500/10 border-violet-500/30 text-violet-300'

    const fallback = (
        <div className={cn('rounded-md border my-2', colorClass)}>
            <div className="flex items-center gap-2 py-2 px-3">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium">Workshop Activity</span>
                <span className="text-[10px] opacity-70 truncate max-w-[300px]">{text}</span>
                <ChevronRight className="h-3 w-3 ml-auto" />
            </div>
        </div>
    )

    return (
        <ClientOnly fallback={fallback}>
            <div className={cn('rounded-md border my-2 transition-all hover:bg-violet-500/5', colorClass)}>
                <div className="flex items-center w-full py-2 px-3 gap-3">
                    <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Workshop</span>
                    </div>

                    <div className="h-4 w-[1px] bg-violet-500/20" />

                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <p className="text-xs font-medium truncate text-violet-100">{text}</p>
                        {agentId && (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1.5 bg-violet-500/20 border-violet-500/40 text-violet-200 shrink-0">
                                <Bot className="h-2.5 w-2.5 mr-1" />
                                {agentId.split(':')[0]}
                            </Badge>
                        )}
                    </div>

                    <div className="text-[10px] font-mono text-violet-400/60 shrink-0">
                        {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                </div>
            </div>
        </ClientOnly>
    )
}
