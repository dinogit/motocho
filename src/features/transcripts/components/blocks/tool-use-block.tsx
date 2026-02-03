import { useState } from 'react'
import {
  Terminal,
  FileEdit,
  FilePlus,
  FileSearch,
  Search,
  FolderSearch,
  ListTodo,
  Globe,
  ChevronDown,
  ChevronRight,
  Bot,
  HelpCircle,
  Loader2,
  Plug,
  Coins,
  Clock,
  Database,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { ClientOnly } from '@/shared/components/client-only'
import { cn } from '@/shared/lib/utils'
import { getAgentTranscript } from '@/shared/services/transcripts/client'
import { AgentLaunchBlock } from './agent-launch-block'
import { MessageBlock } from '../message-block'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import type { AgentProgressData, Message, TokenUsage } from '@/shared/types/transcripts'

interface ToolUseBlockRendererProps {
  name: string
  input: Record<string, any>
  progress?: AgentProgressData[]
  projectId?: string
  sessionId?: string
  agentId?: string
  usage?: TokenUsage
  timestamp?: string
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  Bash: Terminal,
  Edit: FileEdit,
  Write: FilePlus,
  Read: FileSearch,
  Grep: Search,
  Glob: FolderSearch,
  TodoWrite: ListTodo,
  WebFetch: Globe,
  WebSearch: Globe,
  Task: Bot,
  AskUserQuestion: HelpCircle,
  Command: Terminal,
  shell_command: Terminal,
  apply_patch: FileEdit,
  view_image: FileSearch,
  request_user_input: HelpCircle,
  update_plan: ListTodo,
  list_mcp_resources: Database,
  list_mcp_resource_templates: Database,
  read_mcp_resource: Database,
  'multi_tool_use.parallel': Plug,
  parallel: Plug,
}

const TOOL_COLORS: Record<string, string> = {
  Bash: 'bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-300',
  Edit: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300',
  Write: 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-300',
  Read: 'bg-gray-500/10 border-gray-500/30 text-gray-900 dark:text-gray-300',
  Grep: 'bg-orange-500/10 border-orange-500/30 text-orange-900 dark:text-orange-300',
  Glob: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-900 dark:text-cyan-300',
  TodoWrite: 'bg-pink-500/10 border-pink-500/30 text-pink-900 dark:text-pink-300',
  WebFetch: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-300',
  WebSearch: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-300',
  Task: 'bg-violet-500/10 border-violet-500/30 text-violet-900 dark:text-violet-300',
  AskUserQuestion: 'bg-amber-500/10 border-amber-500/30 text-amber-300 dark:text-amber-300',
  Command: 'bg-slate-500/10 border-slate-500/30 text-slate-900 dark:text-slate-300',
  shell_command: 'bg-slate-500/10 border-slate-500/30 text-slate-900 dark:text-slate-300',
  apply_patch: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-300',
  view_image: 'bg-gray-500/10 border-gray-500/30 text-gray-900 dark:text-gray-300',
  request_user_input: 'bg-amber-500/10 border-amber-500/30 text-amber-300 dark:text-amber-300',
  update_plan: 'bg-pink-500/10 border-pink-500/30 text-pink-900 dark:text-pink-300',
  list_mcp_resources: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300',
  list_mcp_resource_templates: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300',
  read_mcp_resource: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300',
  'multi_tool_use.parallel': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-900 dark:text-cyan-300',
  parallel: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-900 dark:text-cyan-300',
}

// Sub-agent type descriptions
const SUBAGENT_DESCRIPTIONS: Record<string, string> = {
  'general-purpose': 'General-purpose agent for complex multi-step tasks',
  'Explore': 'Fast agent for exploring codebases',
  'Plan': 'Software architect for designing implementation plans',
  'claude-code-guide': 'Agent for answering questions about Claude Code',
  'statusline-setup': 'Agent to configure status line settings',
  'code-simplifier': 'Agent for code simplification and refactoring',
  'engineer': 'General software engineering agent',
  'Bash': 'Agent for executing shell commands and scripts',
}

function getDisplayType(type: string) {
  if (type.includes(':')) {
    const [name, id] = type.split(':')
    if (name.toLowerCase() === id.toLowerCase()) return name
  }
  return type
}

export function ToolUseBlockRenderer({ name, input, progress, projectId, sessionId, agentId, usage, timestamp }: ToolUseBlockRendererProps) {
  if (name === 'Task') {
    return (
      <AgentLaunchBlock
        input={input}
        projectId={projectId}
        sessionId={sessionId}
        agentId={agentId}
      />
    )
  }

  const Icon = TOOL_ICONS[name] || Plug
  const colorClass = TOOL_COLORS[name] || 'bg-cyan-500/10 border-cyan-500/30 text-cyan-900 dark:text-cyan-300'

  // Server-side fallback (non-interactive)
  const fallback = (
    <div className={cn('rounded-md border', colorClass)}>
      <div className="flex items-center gap-2 py-2 px-3">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{name}</span>
        {renderToolSummary(name, input)}
        <ChevronRight className="h-3 w-3 ml-auto" />
      </div>
    </div>
  )

  return (
    <ClientOnly fallback={fallback}>
      <ToolUseCollapsible
        name={name}
        input={input}
        progress={progress}
        projectId={projectId}
        sessionId={sessionId}
        agentId={agentId}
        usage={usage}
        timestamp={timestamp}
      />
    </ClientOnly>
  )
}

function ToolUseCollapsible({
  name,
  input,
  progress,
  projectId,
  sessionId,
  agentId: propsAgentId,
  usage,
  timestamp
}: ToolUseBlockRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [agentTranscript, setAgentTranscript] = useState<Message[]>([])
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const Icon = TOOL_ICONS[name] || Plug
  const colorClass = TOOL_COLORS[name] || 'bg-cyan-500/10 border-cyan-500/30 text-cyan-900 dark:text-cyan-300'
  const isMCP = !TOOL_ICONS[name] // Identify if this is likely an MCP/External tool

  // Determine agentId (from props, progress, or input)
  const effectiveAgentId = propsAgentId || progress?.find(p => p.agentId)?.agentId || (input as any).agentId

  const handleViewWorkshop = async (id: string) => {
    if (!projectId || !sessionId) return
    setIsLoadingTranscript(true)
    setIsSheetOpen(true)
    try {
      const messages = await getAgentTranscript(projectId, sessionId, id)
      setAgentTranscript(messages)
    } finally {
      setIsLoadingTranscript(false)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('rounded-md border', colorClass)}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center w-full hover:bg-black/5 cursor-pointer">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 h-auto py-2 px-3 hover:bg-transparent"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{name}</span>
              {renderToolSummary(name, input)}
            </Button>

            <div className="flex items-center gap-2 px-3 shrink-0">
              {/* Optional: Show mini-badge for MCP tools even when collapsed */}
              {isMCP && usage && (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] gap-1 bg-background/50">
                  <Coins className="h-2.5 w-2.5" />
                  ${usage.costUsd.toFixed(2)}
                </Badge>
              )}

              {name === 'Task' && effectiveAgentId && (
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 flex items-center gap-1 font-semibold border border-violet-500/20"
                      onClick={(e) => {
                        e.stopPropagation() // Don't collapse/expand
                        handleViewWorkshop(effectiveAgentId)
                      }}
                    >
                      <Bot className="h-3 w-3" />
                      View Workshop Activity
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col">
                    <SheetHeader className="p-6 pb-2">
                      <SheetTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-violet-500" />
                        Sub-agent Workshop: {getDisplayType(effectiveAgentId)}
                      </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="flex-1 px-6 pb-6 border-t">
                      {isLoadingTranscript ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : agentTranscript.length > 0 ? (
                        <div className="space-y-6 pt-4">
                          {agentTranscript.map((msg) => (
                            <MessageBlock key={msg.uuid} message={msg} projectId={projectId} sessionId={sessionId} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-20 text-muted-foreground">
                          <p>No activity details found for this sub-agent.</p>
                          <p className="text-[10px] mt-2">Checked ID: {effectiveAgentId}</p>
                        </div>
                      )}
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}

              <div className="w-4 h-4 flex items-center justify-center">
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Extended Info Section for MCP/Unknown Tools (or any tool with rich usage) */}
            {isMCP && (
              <div className="mt-1 mb-2 p-2 rounded bg-black/5 text-xs text-muted-foreground grid grid-cols-2 gap-2">
                <div className="col-span-2 font-medium flex items-center gap-1.5 text-foreground/80 border-b border-black/5 pb-1 mb-1">
                  <Database className="h-3 w-3" />
                  Tool Context & Usage
                </div>

                {usage ? (
                  <>
                    <div className="flex justify-between">
                      <span>Total Tokens:</span>
                      <span className="font-mono">{usage.totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Input / Output:</span>
                      <span className="font-mono">{usage.inputTokens.toLocaleString()} / {usage.outputTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Read:</span>
                      <span className="font-mono">{usage.cacheReadTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-cyan-700 dark:text-cyan-400 font-medium">
                      <span>Message Cost:</span>
                      <span className="font-mono flex items-center gap-1">
                        <Coins className="h-3 w-3" /> ${usage.costUsd.toFixed(4)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-center italic opacity-70">
                    Usage details not available
                  </div>
                )}

                {timestamp && (
                  <div className="col-span-2 flex justify-between border-t border-black/5 pt-1 mt-1">
                    <span>Executed at:</span>
                    <span className="font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {renderToolInput(name, input)}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function renderToolSummary(name: string, input: Record<string, any>): React.ReactNode {
  switch (name) {
    case 'Bash':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.command || '').slice(0, 50)}
        </code>
      )
    case 'Edit':
    case 'Write':
    case 'Read':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.file_path || '').split('/').pop()}
        </code>
      )
    case 'Grep':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.pattern || '')}
        </code>
      )
    case 'Glob':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.pattern || '')}
        </code>
      )
    case 'AskUserQuestion':
      return (
        <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">
          {String((input.questions as Array<{ question: string }>)?.[0]?.question || '').slice(0, 40)}...
        </span>
      )
    case 'Command':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.command || '')}
        </code>
      )
    case 'shell_command':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.command || '')}
        </code>
      )
    case 'apply_patch': {
      const patch = typeof input === 'string' ? input : (input.patch || input.input || '')
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(patch).split('\n')[0].slice(0, 60)}
        </code>
      )
    }
    case 'view_image':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.path || input.file_path || '')}
        </code>
      )
    case 'request_user_input': {
      const questions = input.questions as Array<{ question?: string }> | undefined
      return (
        <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">
          {String(questions?.[0]?.question || '').slice(0, 40)}...
        </span>
      )
    }
    case 'update_plan': {
      const plan = input.plan as Array<{ step?: string }> | undefined
      return (
        <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">
          {plan?.length ? `${plan.length} steps` : 'Plan update'}
        </span>
      )
    }
    case 'list_mcp_resources':
    case 'list_mcp_resource_templates':
    case 'read_mcp_resource':
      return (
        <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
          {String(input.server || input.uri || '')}
        </code>
      )
    case 'multi_tool_use.parallel':
    case 'parallel': {
      const toolUses = input.tool_uses as Array<{ recipient_name?: string }> | undefined
      return (
        <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">
          {toolUses?.length ? `${toolUses.length} tool calls` : 'Parallel tools'}
        </span>
      )
    }
    default:
      // For general MCP tools, try to show the first interesting textual param
      const keys = Object.keys(input).filter(k => typeof input[k] === 'string' && k !== 'type')
      const firstParam = keys.length > 0 ? input[keys[0]] : null
      if (firstParam) {
        return (
          <code className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded truncate max-w-[300px]">
            {String(firstParam).slice(0, 40)}...
          </code>
        )
      }
      return null
  }
}

function renderToolInput(name: string, input: Record<string, any>): React.ReactNode {
  switch (name) {
    case 'Bash':
      return (
        <div className="space-y-2">
          {input.description !== undefined && (
            <p className="text-xs text-muted-foreground">{String(input.description)}</p>
          )}
          <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto">
            {String(input.command)}
          </pre>
        </div>
      )

    case 'Edit':
      return (
        <div className="space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">File: </span>
            <code className="bg-black/10 px-1 rounded">{String(input.file_path)}</code>
          </div>
          <div className="grid gap-2">
            <div>
              <Badge variant="outline" className="text-[10px] mb-1 bg-red-500/10 text-red-700">
                Old
              </Badge>
              <pre className="bg-red-500/5 border border-red-500/20 rounded p-2 text-xs font-mono overflow-x-auto">
                {String(input.old_string)}
              </pre>
            </div>
            <div>
              <Badge variant="outline" className="text-[10px] mb-1 bg-green-500/10 text-green-700">
                New
              </Badge>
              <pre className="bg-green-500/5 border border-green-500/20 rounded p-2 text-xs font-mono overflow-x-auto">
                {String(input.new_string)}
              </pre>
            </div>
          </div>
        </div>
      )

    case 'Write':
      return (
        <div className="space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">File: </span>
            <code className="bg-black/10 px-1 rounded">{String(input.file_path)}</code>
          </div>
          <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto max-h-[300px]">
            {String(input.content)}
          </pre>
        </div>
      )

    case 'Read':
      return (
        <div className="text-xs">
          <span className="text-muted-foreground">File: </span>
          <code className="bg-black/10 px-1 rounded">{String(input.file_path)}</code>
          {input.offset !== undefined && (
            <span className="ml-2 text-muted-foreground">
              (offset: {String(input.offset)}, limit: {String(input.limit)})
            </span>
          )}
        </div>
      )

    case 'TodoWrite':
      const todos = input.todos as Array<{ content: string; status: string }> | undefined
      if (!todos) return null
      return (
        <div className="space-y-1">
          {todos.map((todo, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  todo.status === 'completed' && 'bg-green-500/10 text-green-700',
                  todo.status === 'in_progress' && 'bg-yellow-500/10 text-yellow-700',
                  todo.status === 'pending' && 'bg-gray-500/10 text-gray-700'
                )}
              >
                {todo.status}
              </Badge>
              <span>{todo.content}</span>
            </div>
          ))}
        </div>
      )

    case 'AskUserQuestion':
      const questions = input.questions as Array<{
        question: string
        header?: string
        options?: Array<{ label: string; description?: string }>
        multiSelect?: boolean
      }> | undefined
      if (!questions) return null
      return (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              {q.header && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800">
                  {q.header}
                </Badge>
              )}
              <p className="text-xs font-medium">{q.question}</p>
              {q.options && (
                <div className="space-y-1 pl-2 border-l-2 border-amber-500/30">
                  {q.options.map((opt, j) => (
                    <div key={j} className="text-xs">
                      <span className="font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="text-muted-foreground ml-1">- {opt.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {q.multiSelect && (
                <span className="text-[10px] text-muted-foreground">(Multiple selections allowed)</span>
              )}
            </div>
          ))}
        </div>
      )

    case 'Command':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {String(input.command)}
            </Badge>
          </div>
          {input.message && (
            <div className="text-xs text-muted-foreground bg-black/5 p-2 rounded">
              {String(input.message)}
            </div>
          )}
        </div>
      )
    case 'shell_command':
      return (
        <div className="space-y-2">
          {input.workdir && (
            <div className="text-xs">
              <span className="text-muted-foreground">Workdir: </span>
              <code className="bg-black/10 px-1 rounded">{String(input.workdir)}</code>
            </div>
          )}
          <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto">
            {String(input.command)}
          </pre>
          {input.justification && (
            <div className="text-xs text-muted-foreground bg-black/5 p-2 rounded">
              {String(input.justification)}
            </div>
          )}
        </div>
      )
    case 'apply_patch': {
      const patch = typeof input === 'string' ? input : (input.patch || input.input || '')
      return (
        <div className="space-y-2">
          <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto max-h-[300px]">
            {String(patch)}
          </pre>
        </div>
      )
    }
    case 'view_image':
      return (
        <div className="text-xs">
          <span className="text-muted-foreground">Path: </span>
          <code className="bg-black/10 px-1 rounded">{String(input.path || input.file_path)}</code>
        </div>
      )
    case 'request_user_input': {
      const questions = input.questions as Array<{
        question: string
        header?: string
        options?: Array<{ label: string; description?: string }>
      }> | undefined
      if (!questions) return null
      return (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              {q.header && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800">
                  {q.header}
                </Badge>
              )}
              <p className="text-xs font-medium">{q.question}</p>
              {q.options && (
                <div className="space-y-1 pl-2 border-l-2 border-amber-500/30">
                  {q.options.map((opt, j) => (
                    <div key={j} className="text-xs">
                      <span className="font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="text-muted-foreground ml-1">- {opt.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }
    case 'update_plan': {
      const plan = input.plan as Array<{ step?: string; status?: string }> | undefined
      if (!plan) return null
      return (
        <div className="space-y-1">
          {plan.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  item.status === 'completed' && 'bg-green-500/10 text-green-700',
                  item.status === 'in_progress' && 'bg-yellow-500/10 text-yellow-700',
                  item.status === 'pending' && 'bg-gray-500/10 text-gray-700'
                )}
              >
                {item.status || 'pending'}
              </Badge>
              <span>{item.step || 'Untitled step'}</span>
            </div>
          ))}
        </div>
      )
    }
    case 'list_mcp_resources':
    case 'list_mcp_resource_templates':
    case 'read_mcp_resource':
      return (
        <div className="space-y-2 text-xs">
          {input.server && (
            <div>
              <span className="text-muted-foreground">Server: </span>
              <code className="bg-black/10 px-1 rounded">{String(input.server)}</code>
            </div>
          )}
          {input.uri && (
            <div>
              <span className="text-muted-foreground">URI: </span>
              <code className="bg-black/10 px-1 rounded">{String(input.uri)}</code>
            </div>
          )}
          {input.cursor && (
            <div>
              <span className="text-muted-foreground">Cursor: </span>
              <code className="bg-black/10 px-1 rounded">{String(input.cursor)}</code>
            </div>
          )}
        </div>
      )
    case 'multi_tool_use.parallel':
    case 'parallel': {
      const toolUses = input.tool_uses as Array<{ recipient_name?: string; parameters?: Record<string, any> }> | undefined
      if (!toolUses || toolUses.length === 0) return null
      return (
        <div className="space-y-2">
          {toolUses.map((tool, i) => (
            <div key={i} className="text-xs space-y-1">
              <Badge variant="outline" className="text-[10px]">
                {tool.recipient_name || 'tool'}
              </Badge>
              <pre className="bg-black/10 rounded p-2 text-[10px] font-mono overflow-x-auto">
                {JSON.stringify(tool.parameters ?? {}, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )
    }

    default:
      return (
        <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto">
          {JSON.stringify(input, null, 2)}
        </pre>
      )
  }
}
