import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Bot } from 'lucide-react'
import type { ModelUsageEntryV2 } from '@/shared/types/analytics-v2'

interface ModelUsageCardProps {
  data: ModelUsageEntryV2[]
}

function formatModelName(modelId: string) {
  return modelId.replace('claude-', '').replace(/-\d+$/, '')
}

export function ModelUsageCard({ data }: ModelUsageCardProps) {
  const sorted = [...data].sort((a, b) => {
    const aTokens = a.inputTokens + a.outputTokens + a.cacheReadInputTokens + a.cacheCreationInputTokens
    const bTokens = b.inputTokens + b.outputTokens + b.cacheReadInputTokens + b.cacheCreationInputTokens
    return bTokens - aTokens
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Model Usage
        </CardTitle>
        <CardDescription>Tokens and cost by model</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((usage) => {
            const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens
            return (
              <div key={`${usage.source}-${usage.modelId}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatModelName(usage.modelId)}</span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {usage.source}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <div>{(totalTokens / 1_000_000).toFixed(1)}M tokens</div>
                    <div>${usage.costUSD.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between rounded bg-muted/50 px-2 py-1">
                    <span className="text-muted-foreground">Input</span>
                    <span>{(usage.inputTokens / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between rounded bg-muted/50 px-2 py-1">
                    <span className="text-muted-foreground">Output</span>
                    <span>{(usage.outputTokens / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex justify-between rounded bg-green-500/10 px-2 py-1">
                    <span className="text-muted-foreground">Cache Read</span>
                    <span>{(usage.cacheReadInputTokens / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between rounded bg-blue-500/10 px-2 py-1">
                    <span className="text-muted-foreground">Cache Write</span>
                    <span>{(usage.cacheCreationInputTokens / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between rounded bg-muted/50 px-2 py-1">
                    <span className="text-muted-foreground">Messages</span>
                    <span>{usage.messageCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between rounded bg-amber-500/10 px-2 py-1">
                    <span className="text-muted-foreground">Context</span>
                    <span>{usage.contextWindow.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
