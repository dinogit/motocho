import type { ContentBlock } from '@/shared/services/transcripts/types'
import { TextBlockRenderer } from './blocks/text-block'
import { ToolUseBlockRenderer } from './blocks/tool-use-block'
import { ToolResultBlockRenderer } from './blocks/tool-result-block'
import { ThinkingBlockRenderer } from './blocks/thinking-block'
import { ImageBlockRenderer } from './blocks/image-block'

interface ContentBlockRendererProps {
  block: ContentBlock
}

export function ContentBlockRenderer({ block }: ContentBlockRendererProps) {
  switch (block.type) {
    case 'text':
      return <TextBlockRenderer text={block.text} />

    case 'tool_use':
      return (
        <ToolUseBlockRenderer
          name={block.name}
          input={block.input}
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
      return <ThinkingBlockRenderer thinking={block.thinking} />

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