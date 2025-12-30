import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Bot } from 'lucide-react'
import type { StatsCache } from '@/shared/services/analytics/types'

interface ModelUsageCardProps {
  data: StatsCache['modelUsage']
}

export function ModelUsageCard({ data }: ModelUsageCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Model Usage Breakdown
        </CardTitle>
        <CardDescription>Token usage by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(data).map(([modelId, usage]) => {
            const modelName = modelId.replace('claude-', '').replace(/-\d+$/, '')
            const totalTokens = usage.inputTokens + usage.outputTokens +
              usage.cacheReadInputTokens + usage.cacheCreationInputTokens

            return (
              <div key={modelId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{modelName}</span>
                  <span className="text-sm text-muted-foreground">
                    {(totalTokens / 1_000_000).toFixed(1)}M tokens
                  </span>
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
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}