import { useMemo } from 'react'

interface TextBlockRendererProps {
  text: string
}

export function TextBlockRenderer({ text }: TextBlockRendererProps) {
  const formattedText = useMemo(() => {
    // Simple markdown-like formatting
    return text
      .split('\n')
      .map((line, i) => {
        // Code blocks (```...```)
        if (line.startsWith('```')) {
          return null // Handled separately
        }

        // Headers
        if (line.startsWith('### ')) {
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="font-semibold mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={i} className="font-bold text-lg mt-3 mb-1">
              {line.slice(2)}
            </h2>
          )
        }

        // List items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <li key={i} className="ml-4 list-disc">
              {formatInlineCode(line.slice(2))}
            </li>
          )
        }

        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s(.+)$/)
        if (numberedMatch) {
          return (
            <li key={i} className="ml-4 list-decimal">
              {formatInlineCode(numberedMatch[2])}
            </li>
          )
        }

        // Empty lines
        if (line.trim() === '') {
          return <br key={i} />
        }

        // Regular paragraph
        return (
          <p key={i} className="mb-1">
            {formatInlineCode(line)}
          </p>
        )
      })
  }, [text])

  // Handle code blocks
  const parts = text.split(/(```[\s\S]*?```)/g)

  return (
    <div className="text-sm whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n')
          const language = lines[0] || ''
          const code = lines.slice(1).join('\n')

          return (
            <pre
              key={i}
              className="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs font-mono"
            >
              {language && (
                <div className="text-[10px] text-muted-foreground mb-2 uppercase">
                  {language}
                </div>
              )}
              <code>{code}</code>
            </pre>
          )
        }

        return <span key={i}>{formattedText}</span>
      })}
    </div>
  )
}

function formatInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g)

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}