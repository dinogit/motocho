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
  Wrench,
  Bot,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { ClientOnly } from '@/shared/components/client-only'
import { cn } from '@/shared/lib/utils'

interface ToolUseBlockRendererProps {
  name: string
  input: Record<string, unknown>
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
}

const TOOL_COLORS: Record<string, string> = {
  Bash: 'bg-green-500/10 border-green-500/30 text-green-700',
  Edit: 'bg-blue-500/10 border-blue-500/30 text-blue-700',
  Write: 'bg-purple-500/10 border-purple-500/30 text-purple-700',
  Read: 'bg-gray-500/10 border-gray-500/30 text-gray-700',
  Grep: 'bg-orange-500/10 border-orange-500/30 text-orange-700',
  Glob: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700',
  TodoWrite: 'bg-pink-500/10 border-pink-500/30 text-pink-700',
  WebFetch: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700',
  WebSearch: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700',
  Task: 'bg-violet-500/10 border-violet-500/30 text-violet-700',
  AskUserQuestion: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
}

// Sub-agent type descriptions
const SUBAGENT_DESCRIPTIONS: Record<string, string> = {
  'general-purpose': 'General-purpose agent for complex multi-step tasks',
  'Explore': 'Fast agent for exploring codebases',
  'Plan': 'Software architect for designing implementation plans',
  'claude-code-guide': 'Agent for answering questions about Claude Code',
  'statusline-setup': 'Agent to configure status line settings',
}

export function ToolUseBlockRenderer({ name, input }: ToolUseBlockRendererProps) {
  const Icon = TOOL_ICONS[name] || Wrench
  const colorClass = TOOL_COLORS[name] || 'bg-muted border-border'

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
      <ToolUseCollapsible name={name} input={input} />
    </ClientOnly>
  )
}

function ToolUseCollapsible({ name, input }: ToolUseBlockRendererProps) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = TOOL_ICONS[name] || Wrench
  const colorClass = TOOL_COLORS[name] || 'bg-muted border-border'

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn('rounded-md border', colorClass)}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-auto py-2 px-3 hover:bg-black/5"
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{name}</span>
            {renderToolSummary(name, input)}
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {renderToolInput(name, input)}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function renderToolSummary(name: string, input: Record<string, unknown>): React.ReactNode {
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
    case 'Task':
      const agentType = String(input.subagent_type || 'unknown')
      return (
        <Badge variant="outline" className="text-[10px] py-0 bg-violet-500/20 text-violet-800 border-violet-500/40">
          {agentType}
        </Badge>
      )
    case 'AskUserQuestion':
      return (
        <span className="text-[10px] text-muted-foreground truncate max-w-[300px]">
          {String((input.questions as Array<{question: string}>)?.[0]?.question || '').slice(0, 40)}...
        </span>
      )
    default:
      return null
  }
}

function renderToolInput(name: string, input: Record<string, unknown>): React.ReactNode {
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

    case 'Task':
      const subagentType = String(input.subagent_type || 'unknown')
      const description = SUBAGENT_DESCRIPTIONS[subagentType] || 'Unknown agent type'
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-violet-500/20 text-violet-800 border-violet-500/40">
              <Bot className="h-3 w-3 mr-1" />
              {subagentType}
            </Badge>
            <span className="text-xs text-muted-foreground">{description}</span>
          </div>
          {input.description !== undefined && (
            <div className="text-xs">
              <span className="text-muted-foreground">Task: </span>
              <span>{String(input.description)}</span>
            </div>
          )}
          {input.model !== undefined && (
            <div className="text-xs">
              <span className="text-muted-foreground">Model: </span>
              <code className="bg-black/10 px-1 rounded">{String(input.model)}</code>
            </div>
          )}
          {input.run_in_background === true && (
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700">
              Running in background
            </Badge>
          )}
          {input.prompt !== undefined && (
            <div>
              <span className="text-xs text-muted-foreground">Prompt:</span>
              <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto mt-1 max-h-[200px]">
                {String(input.prompt)}
              </pre>
            </div>
          )}
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

    default:
      return (
        <pre className="bg-black/10 rounded p-2 text-xs font-mono overflow-x-auto">
          {JSON.stringify(input, null, 2)}
        </pre>
      )
  }
}