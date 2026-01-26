/**
 * Plan View Page
 *
 * Displays a single Claude Code plan with markdown rendering.
 */

import { Link } from '@tanstack/react-router'
import { ArrowLeft, FileText, Calendar, HardDrive, Copy, Check, Download } from 'lucide-react'
import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Route } from '@/routes/plans/$planId'
import type { Plan } from '@/shared/types/plans'

export function PlanViewPage() {
  const { plan } = Route.useLoaderData() as { plan: Plan }
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plan.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    try {
      // Sanitize plan title for filename
      const sanitizedTitle = plan.title.replace(/[/\\]/g, '-').substring(0, 50)
      const timestamp = new Date().toISOString().split('T')[0]
      const defaultFilename = `plan-${sanitizedTitle}-${timestamp}.md`

      await invoke('save_report', {
        content: plan.content,
        defaultFilename,
      })
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <Link to="/plans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {plan.title}
              </h1>
              <p className="text-muted-foreground mt-1">{plan.overview}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Download className="mr-2 h-4 w-4" />
                Save as .md
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(plan.lastModified).toLocaleDateString()} at{' '}
              {new Date(plan.lastModified).toLocaleTimeString()}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              {(plan.size / 1024).toFixed(1)} KB
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {plan.id}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={plan.content} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Simple markdown renderer
 * Converts markdown to HTML with basic styling
 */
function MarkdownRenderer({ content }: { content: string }) {
  // Process markdown to HTML (basic implementation)
  const html = processMarkdown(content)

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function processMarkdown(content: string): string {
  let html = content

  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (```lang\ncode\n```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm font-mono">${code.trim()}</code></pre>`
  })

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-border" />')

  // Lists (unordered)
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc my-2 space-y-1">$&</ul>')

  // Lists (ordered)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')

  // Paragraphs - wrap non-special lines
  html = html.split('\n\n').map(block => {
    if (block.match(/^<(h[1-6]|ul|ol|li|pre|hr|div)/)) {
      return block
    }
    if (block.trim()) {
      return `<p class="my-2 leading-relaxed">${block}</p>`
    }
    return ''
  }).join('\n')

  // Clean up extra whitespace
  html = html.replace(/\n{3,}/g, '\n\n')

  return html
}