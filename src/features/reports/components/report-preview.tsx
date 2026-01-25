import { ScrollArea } from '@/shared/components/ui/scroll-area'

interface ReportPreviewProps {
  markdown: string
}

export function ReportPreview({ markdown }: ReportPreviewProps) {
  return (
    <ScrollArea className="h-[500px] rounded-md border bg-muted/30">
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
        {markdown}
      </pre>
    </ScrollArea>
  )
}
