import { User, Bot, Coins, MessageSquare } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { ContentBlockRenderer } from './content-block-renderer'
import type { Message } from '@/shared/services/transcripts/types'

interface MessageBlockProps {
  message: Message
  onAsk?: (content: string, toolName: string, type: 'tool_use' | 'tool_result' | 'text') => void
}

export function MessageBlock({ message, onAsk }: MessageBlockProps) {
  const isUser = message.type === 'user'
  const usage = message.usage

  // Serialize all content blocks to a string for the "Ask" feature
  const getMessageContent = () => {
    return message.content.map(block => {
      if (block.type === 'text') return block.text
      if (block.type === 'tool_use') return `Tool: ${block.name}\n${JSON.stringify(block.input, null, 2)}`
      if (block.type === 'tool_result') return typeof block.content === 'string' ? block.content : JSON.stringify(block.content)
      if (block.type === 'thinking') return block.thinking
      return JSON.stringify(block)
    }).join('\n\n')
  }

  const handleAskMessage = () => {
    if (onAsk) {
      onAsk(getMessageContent(), 'response', 'text')
    }
  }

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row' : 'flex-row')}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className={cn('h-8 w-8 shrink-0 cursor-help', isUser ? 'bg-primary' : 'bg-orange-500')}>
              <AvatarFallback className={cn(isUser ? 'bg-primary text-primary-foreground' : 'bg-orange-500 text-white')}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{isUser ? 'User (You)' : 'Assistant (Claude)'}</p>
            {!isUser && message.model && (
              <p className="text-xs text-muted-foreground">{message.model}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Card
        className={cn(
          'flex-1 overflow-hidden',
          isUser
            ? 'border-primary/20 bg-primary/5'
            : 'border-orange-500/20 bg-orange-500/5'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center flex-wrap gap-2 mb-2 text-xs text-muted-foreground">
            <span className="font-medium">{isUser ? 'You' : 'Claude'}</span>
            {message.model && (
              <Badge variant="outline" className="text-[10px] py-0">
                {message.model.replace('claude-', '').replace(/-\d+$/, '')}
              </Badge>
            )}
            {message.timestamp && (
              <span>
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            )}
            {usage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 cursor-help">
                      <span className="text-[10px]">
                        {usage.totalTokens.toLocaleString()} tokens
                      </span>
                      <Coins className="h-3 w-3" />
                      <span className="font-medium">${usage.costUsd.toFixed(4)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>Input:</span>
                        <span>{usage.inputTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Output:</span>
                        <span>{usage.outputTokens.toLocaleString()}</span>
                      </div>
                      {usage.cacheCreationTokens > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>Cache Write:</span>
                          <span>{usage.cacheCreationTokens.toLocaleString()}</span>
                        </div>
                      )}
                      {usage.cacheReadTokens > 0 && (
                        <div className="flex justify-between gap-4">
                          <span>Cache Read:</span>
                          <span>{usage.cacheReadTokens.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Ask button for assistant messages */}
            {!isUser && onAsk && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 px-2 hover:bg-primary/10"
                      onClick={handleAskMessage}
                    >
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="ml-1 text-xs">Ask</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ask Claude about this response</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="space-y-3">
            {message.content.map((block, index) => (
              <ContentBlockRenderer key={index} block={block} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}