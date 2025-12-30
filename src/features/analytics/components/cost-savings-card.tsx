import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { PiggyBank, TrendingDown, Percent, ExternalLink } from 'lucide-react'
import type { StatsCache } from '@/shared/services/analytics/types'

// Pricing per million tokens
const PRICING = {
  'claude-opus-4-5-20251101': { input: 5, cacheRead: 0.5 },
  'claude-sonnet-4-5-20241022': { input: 3, cacheRead: 0.3 },
  'default': { input: 3, cacheRead: 0.3 },
}

interface CostSavingsCardProps {
  data: StatsCache['modelUsage']
}

export function CostSavingsCard({ data }: CostSavingsCardProps) {
  let totalCacheReadTokens = 0
  let totalInputTokens = 0
  let actualCost = 0
  let costWithoutCache = 0

  for (const [modelId, usage] of Object.entries(data)) {
    const pricing = PRICING[modelId as keyof typeof PRICING] || PRICING['default']

    totalCacheReadTokens += usage.cacheReadInputTokens
    totalInputTokens += usage.inputTokens

    // Actual cost (cache read at reduced rate)
    const cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * pricing.cacheRead
    const inputCost = (usage.inputTokens / 1_000_000) * pricing.input
    actualCost += cacheReadCost + inputCost

    // What it would cost without cache (all as regular input)
    const allAsInput = ((usage.cacheReadInputTokens + usage.inputTokens) / 1_000_000) * pricing.input
    costWithoutCache += allAsInput
  }

  const savedAmount = costWithoutCache - actualCost
  const savingsPercent = costWithoutCache > 0 ? (savedAmount / costWithoutCache) * 100 : 0
  const cacheHitRatio = (totalCacheReadTokens / (totalCacheReadTokens + totalInputTokens)) * 100

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <PiggyBank className="h-5 w-5" />
          Cost Savings from Caching
        </CardTitle>
        <CardDescription>How much prompt caching saves you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main savings display */}
        <div className="text-center space-y-1">
          <div className="text-4xl font-bold text-green-600">
            ${savedAmount.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">
            saved by caching
          </div>
        </div>

        {/* Cost comparison */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5" />
              Actual Cost
            </div>
            <div className="text-lg font-semibold">${actualCost.toFixed(2)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Without Cache</div>
            <div className="text-lg font-semibold text-muted-foreground line-through">
              ${costWithoutCache.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Cache efficiency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" />
              Cache Hit Ratio
            </span>
            <span className="font-medium">{cacheHitRatio.toFixed(1)}%</span>
          </div>
          <Progress value={cacheHitRatio} className="h-2" />
        </div>

        {/* Token breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between rounded bg-green-500/10 px-2 py-1.5">
            <span className="text-muted-foreground">Cache Read</span>
            <span className="font-medium">{(totalCacheReadTokens / 1_000_000).toFixed(1)}M</span>
          </div>
          <div className="flex justify-between rounded bg-muted/50 px-2 py-1.5">
            <span className="text-muted-foreground">Fresh Input</span>
            <span className="font-medium">{(totalInputTokens / 1_000).toFixed(0)}k</span>
          </div>
        </div>

        {/* Savings percentage */}
        <div className="text-center text-sm text-muted-foreground">
          You're paying only <span className="font-semibold text-green-600">{(100 - savingsPercent).toFixed(0)}%</span> of what it would cost without caching
        </div>

        {/* Learn more link */}
        <div className="pt-2 border-t">
          <a
            href="https://ngrok.com/blog/prompt-caching"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Learn more about prompt caching
          </a>
        </div>
      </CardContent>
    </Card>
  )
}