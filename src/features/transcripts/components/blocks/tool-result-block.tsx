import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { ClientOnly } from '@/shared/components/client-only'
import { cn } from '@/shared/lib/utils'
import type { ToolResultContent } from '@/shared/services/transcripts/types'

interface ToolResultBlockRendererProps {
  content: string | ToolResultContent[]
  isError?: boolean
}

export function ToolResultBlockRenderer({
  content,
  isError,
}: ToolResultBlockRendererProps) {
  const textContent = getTextContent(content)
  const preview = textContent.length > 200 ? textContent.slice(0, 200) + '...' : textContent

  // Server-side fallback (simple non-interactive version)
  const fallback = (
    <div
      className={cn(
        'rounded-md border',
        isError ? 'bg-red-500/5 border-red-500/30' : 'bg-muted/50 border-border'
      )}
    >
      <div className="flex items-center gap-2 py-2 px-3">
        {isError ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        <span className="text-xs font-medium">{isError ? 'Error' : 'Result'}</span>
        <span className="text-xs text-muted-foreground ml-2">{textContent.length} chars</span>
      </div>
      <div className="px-3 pb-2">
        <pre className={cn('text-xs font-mono whitespace-pre-wrap', isError && 'text-red-600')}>
          {preview}
        </pre>
      </div>
    </div>
  )

  return (
    <ClientOnly fallback={fallback}>
      <ToolResultCollapsible content={content} isError={isError} />
    </ClientOnly>
  )
}

function ToolResultCollapsible({
  content,
  isError,
}: ToolResultBlockRendererProps) {
  const [isOpen, setIsOpen] = useState(false)

  const textContent = getTextContent(content)
  const hasLongContent = textContent.length > 200
  const preview = hasLongContent ? textContent.slice(0, 200) + '...' : textContent

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'rounded-md border',
          isError
            ? 'bg-red-500/5 border-red-500/30'
            : 'bg-muted/50 border-border'
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-auto py-2 px-3 hover:bg-black/5"
          >
            {isError ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <span className="text-xs font-medium">
              {isError ? 'Error' : 'Result'}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {textContent.length} chars
            </span>
            {hasLongContent && (
              isOpen ? (
                <ChevronDown className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronRight className="h-3 w-3 ml-auto" />
              )
            )}
          </Button>
        </CollapsibleTrigger>

        {!isOpen && (
          <div className="px-3 pb-2">
            <pre
              className={cn(
                'text-xs font-mono whitespace-pre-wrap',
                isError && 'text-red-600'
              )}
            >
              {preview}
            </pre>
          </div>
        )}

        <CollapsibleContent>
          <div className="px-3 pb-3">
            {renderContent(content, isError)}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function getTextContent(content: string | ToolResultContent[]): string {
  if (typeof content === 'string') {
    return content
  }

  return content
    .filter((item): item is { type: 'text'; text: string } => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
}

function renderContent(
  content: string | ToolResultContent[],
  isError?: boolean
): React.ReactNode {
  if (typeof content === 'string') {
    return (
      <pre
        className={cn(
          'text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto',
          isError && 'text-red-600'
        )}
      >
        {content}
      </pre>
    )
  }

  return (
    <div className="space-y-2">
      {content.map((item, index) => {
        if (item.type === 'text') {
          return (
            <pre
              key={index}
              className={cn(
                'text-xs font-mono whitespace-pre-wrap overflow-x-auto',
                isError && 'text-red-600'
              )}
            >
              {item.text}
            </pre>
          )
        }

        if (item.type === 'image' && item.source) {
          const dataUrl = `data:${item.source.media_type};base64,${item.source.data}`
          return (
            <img
              key={index}
              src={dataUrl}
              alt="Tool result"
              className="max-w-full h-auto rounded"
            />
          )
        }

        return null
      })}
    </div>
  )
}