import { Webhook, Code2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { ClientOnly } from '@/shared/components/client-only'

interface HookBlockProps {
  hookEvent?: string
  hookName?: string
  command?: string
  timestamp?: string
}

const HOOK_COLORS: Record<string, string> = {
  'SessionStart': 'bg-slate-500/10 border-slate-500/30 text-chart-5',
  'PreToolUse': 'bg-slate-500/10 border-slate-500/30 text-chart-5',
  'default': 'bg-slate-500/10 border-slate-500/30 text-chart-5',
}

export function HookBlock({ hookEvent = 'unknown', hookName = hookEvent, command = '' }: HookBlockProps) {

  const colorClass = HOOK_COLORS[hookEvent] || HOOK_COLORS['default']
  const hookType = hookName?.split(':')[0] || hookEvent

  const fallback = (
    <div className={cn('rounded-md border my-2', colorClass)}>
      <div className="flex items-center gap-2 py-2 px-3">
        <Webhook className="h-4 w-4" />
        <span className="text-xs font-medium">Hook Event</span>
        <span className="text-[10px] opacity-70">{hookName}</span>
      </div>
    </div>
  )

  return (
    <ClientOnly fallback={fallback}>
      <div className={cn('rounded-md border transition-all hover:bg-opacity-50', colorClass)}>
        <div className="flex items-center w-full gap-3 py-2.5 px-3">
          <div className="flex items-center gap-2 shrink-0">
            <Webhook className="h-3.5 w-3.5 opacity-70" />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Hook</span>
          </div>

          <div className="h-3.5 w-px opacity-20" />

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Badge
              variant="outline"
              className="text-[9px] h-5 px-2 shrink-0 font-semibold"
            >
              {hookEvent}
            </Badge>
            <p className="text-xs truncate opacity-80 font-medium">{hookType}</p>
          </div>

          {command && (
            <div className="flex items-center gap-1.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <Code2 className="h-3 w-3" />
              <code className="text-[9px] font-mono truncate max-w-50">
                {command.split('/').pop()}
              </code>
            </div>
          )}
        </div>
      </div>
    </ClientOnly>
  )
}