import { Activity, Bot } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

interface ProgressBlockRendererProps {
    text: string
    agentId?: string
    timestamp?: string
    toolUseID?: string
}

export function ProgressBlockRenderer({ text, agentId, timestamp, toolUseID }: ProgressBlockRendererProps) {
    return (
        <div className="flex flex-col gap-1.5 py-1 px-2 rounded bg-violet-500/5 border border-violet-500/10 hover:bg-violet-500/10 transition-colors group">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-violet-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-muted-foreground">
                        {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Progress'}
                    </span>
                </div>

                {agentId && (
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-violet-500/10 border-none text-violet-600">
                        <Bot className="h-2.5 w-2.5 mr-1" />
                        {agentId.split(':')[0]}
                    </Badge>
                )}
            </div>

            <p className="text-xs leading-relaxed text-foreground/80 font-medium">{text}</p>

            {toolUseID && (
                <div className="flex items-center gap-1.5 mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-muted-foreground font-mono">ID: {toolUseID.substring(0, 8)}...</span>
                </div>
            )}
        </div>
    )
}
