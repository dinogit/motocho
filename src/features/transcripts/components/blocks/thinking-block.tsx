import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'

interface ThinkingBlockRendererProps {
  thinking: string
}

export function ThinkingBlockRenderer({ thinking }: ThinkingBlockRendererProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Truncate for preview
  const preview = thinking.slice(0, 150) + (thinking.length > 150 ? '...' : '')

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-auto py-2 px-3 hover:bg-yellow-500/10"
          >
            <Brain className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">Thinking</span>
            {isOpen ? (
              <ChevronDown className="h-3 w-3 ml-auto" />
            ) : (
              <ChevronRight className="h-3 w-3 ml-auto" />
            )}
          </Button>
        </CollapsibleTrigger>

        {!isOpen && (
          <div className="px-3 pb-2 text-xs text-muted-foreground italic line-clamp-2">
            {preview}
          </div>
        )}

        <CollapsibleContent>
          <div className="px-3 pb-3 text-sm whitespace-pre-wrap text-muted-foreground">
            {thinking}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}