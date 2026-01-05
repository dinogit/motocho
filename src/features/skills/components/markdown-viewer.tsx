/**
 * Markdown Viewer
 *
 * Renders markdown content with GitHub Flavored Markdown support.
 * Used for displaying CLAUDE.md and skill content.
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerProps {
  content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Customize code blocks
        pre: ({ children }) => (
          <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs">
            {children}
          </pre>
        ),
        code: ({ children, className }) => {
          // Inline code vs code blocks
          const isInline = !className
          if (isInline) {
            return (
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                {children}
              </code>
            )
          }
          return <code className={className}>{children}</code>
        },
        // Style headings
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-medium mt-2 mb-1">{children}</h3>
        ),
        // Style lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
        ),
        // Style links
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        // Style tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full border-collapse text-sm">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border px-2 py-1 bg-muted font-medium text-left">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-2 py-1">{children}</td>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
