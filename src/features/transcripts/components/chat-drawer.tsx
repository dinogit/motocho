/**
 * Chat Drawer Component
 *
 * A slide-out sheet for chatting with Claude about specific
 * parts of a transcript. Uses Claude Code CLI via Tauri.
 */

import { useState, useRef, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Send, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/shared/components/ui/sheet'
import { cn } from '@/shared/lib/utils'

export interface ChatContext {
  type: 'tool_use' | 'tool_result' | 'text'
  toolName?: string
  content: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  context: ChatContext | null
  projectId: string
  sessionId: string
}

export function ChatDrawer({
  isOpen,
  onClose,
  context,
}: ChatDrawerProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Clear messages when context changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [context])

  const sendMessage = async (question: string) => {
    if (!context) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await invoke<string>('ask_claude_cli', {
        context: context.content,
        question,
        history,
      })

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input.trim())
      setInput('')
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMessages([])
      setError(null)
      onClose()
    }
  }

  return (
    <Sheet open={isOpen && !!context} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Ask about this
          </SheetTitle>
          {context && (
            <SheetDescription asChild>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">
                  {context.type === 'tool_use' ? context.toolName : context.type}
                </Badge>
                <pre className="text-xs font-mono text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {context.content.slice(0, 200)}
                  {context.content.length > 200 && '...'}
                </pre>
              </div>
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="h-full w-auto p-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ask a question about this content</p>
              <div className="mt-4 space-y-2">
                <SuggestionButton
                  onClick={() => sendMessage('What does this do?')}
                  disabled={isLoading}
                >
                  What does this do?
                </SuggestionButton>
                <SuggestionButton
                  onClick={() => sendMessage('Why was this approach used?')}
                  disabled={isLoading}
                >
                  Why this approach?
                </SuggestionButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs text-muted-foreground">Asking Claude...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-start">
                  <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <SheetFooter className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function SuggestionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="block w-full text-left px-3 py-2 text-xs bg-muted/50 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  )
}
