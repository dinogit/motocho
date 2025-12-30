/**
 * Chat Drawer Component
 *
 * A slide-out drawer for chatting with Claude about specific
 * parts of a transcript. Uses TanStack AI for streaming responses.
 */

import { useState, useRef, useEffect } from 'react'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { X, Send, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'

export interface ChatContext {
  type: 'tool_use' | 'tool_result' | 'text'
  toolName?: string
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
  projectId,
  sessionId,
}: ChatDrawerProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, isLoading, clear } = useChat({
    connection: fetchServerSentEvents('/api/chat', () => ({
      body: {
        context,
        projectId,
        sessionId,
      },
    })),
  })

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
    clear()
  }, [context, clear])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      sendMessage(input.trim())
      setInput('')
    }
  }

  const handleClose = () => {
    clear()
    onClose()
  }

  if (!isOpen || !context) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">Ask about this</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Context preview */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {context.type === 'tool_use' ? context.toolName : context.type}
            </Badge>
          </div>
          <pre className="text-xs font-mono text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {context.content.slice(0, 200)}
            {context.content.length > 200 && '...'}
          </pre>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
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
                <SuggestionButton
                  onClick={() => sendMessage('Save this to my library')}
                  disabled={isLoading}
                >
                  Save to library
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
                    {message.parts?.map((part, i) => {
                      if (part.type === 'text') {
                        // TanStack AI text parts have 'value' not 'text'
                        const textValue = 'text' in part ? String(part.text) :
                                         'value' in part ? String(part.value) : ''
                        return (
                          <div key={i} className="whitespace-pre-wrap">
                            {textValue}
                          </div>
                        )
                      }
                      if (part.type === 'tool-call') {
                        // Handle tool call part with type guard
                        const toolName = 'toolName' in part ? String(part.toolName) :
                                        'name' in part ? String(part.name) : 'tool'
                        return (
                          <div key={i} className="my-2 p-2 bg-background/50 rounded text-xs">
                            <Badge variant="secondary" className="mb-1">
                              {toolName}
                            </Badge>
                          </div>
                        )
                      }
                      if (part.type === 'tool-result') {
                        // Handle tool result part with type guard
                        const resultValue = 'result' in part ? part.result :
                                           'value' in part ? part.value : null
                        return (
                          <div key={i} className="my-2 p-2 bg-background/50 rounded text-xs">
                            <div className="text-green-600">
                              ✓ {JSON.stringify(resultValue)}
                            </div>
                          </div>
                        )
                      }
                      return null
                    }) || <div className="whitespace-pre-wrap">{String((message as { content?: string }).content || '')}</div>}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
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
          </div>
        </form>
      </div>
    </>
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