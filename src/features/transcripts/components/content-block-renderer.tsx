import type { ContentBlock, TokenUsage } from '@/shared/types/transcripts'
import { TextBlockRenderer } from './blocks/text-block'
import { ToolUseBlockRenderer } from './blocks/tool-use-block'
import { ToolResultBlockRenderer } from './blocks/tool-result-block'
import { ThinkingBlockRenderer } from './blocks/thinking-block'
import { ImageBlockRenderer } from './blocks/image-block'

interface ContentBlockRendererProps {
  block: ContentBlock
  projectId?: string
  sessionId?: string
  usage?: TokenUsage
  timestamp?: string
}

export function ContentBlockRenderer({ block, projectId, sessionId, usage, timestamp }: ContentBlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlockRenderer text={block.text || ''} />

    case 'tool_use':
      return (
        <ToolUseBlockRenderer
          name={block.name || 'Unknown Tool'}
          input={block.input || {}}
          progress={block.progress}
          projectId={projectId}
          sessionId={sessionId}
          agentId={(block as any).agentId}
          usage={usage}
          timestamp={timestamp}
        />
      )

    case 'tool_result':
      return (
        <ToolResultBlockRenderer
          content={block.content}
          isError={block.is_error}
        />
      )

    case 'thinking':
      return <ThinkingBlockRenderer thinking={block.thinking || ''} />

    case 'image':
      return <ImageBlockRenderer source={block.source} />

    default:
      return (
        <div className="text-xs text-muted-foreground">
          Unknown block type: {(block as { type: string }).type}
        </div>
      )
  }
}