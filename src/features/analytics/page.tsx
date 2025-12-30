import { useLoaderData } from '@tanstack/react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { MessageSquare, Coins, Calendar, Wrench } from 'lucide-react'
import type { StatsCache, AnalyticsSummary } from '@/shared/services/analytics/types'
import { SummaryCard } from './components/summary-card'
import { DailyActivityChart } from './components/daily-activity-chart'
import { HourlyActivityChart } from './components/hourly-activity-chart'
import { TokensChart } from './components/tokens-chart'
import { ModelUsageCard } from './components/model-usage-card'
import { CostSavingsCard } from './components/cost-savings-card'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
} from '@/shared/components/page/page-header'

export function Page() {
  const { stats, summary } = useLoaderData({ from: '/analytics' }) as {
    stats: StatsCache | null
    summary: AnalyticsSummary | null
  }

  if (!stats || !summary) {
    return (
      <>
        <PageHeader>
          <PageHeaderContent>
            <PageTitle>Analytics</PageTitle>
          </PageHeaderContent>
        </PageHeader>
        <div className="flex flex-1 items-center justify-center p-8">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No Analytics Data</CardTitle>
              <CardDescription>
                Could not find stats-cache.json in ~/.claude/
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <div>
            <PageTitle>Analytics</PageTitle>
            <PageDescription>
              Your Claude Code usage since {new Date(summary.firstSessionDate).toLocaleDateString()}
            </PageDescription>
          </div>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-1 flex-col gap-6 p-6">

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Sessions"
          value={summary.totalSessions.toLocaleString()}
          description={`${summary.daysActive} days active`}
          icon={Calendar}
        />
        <SummaryCard
          title="Total Messages"
          value={summary.totalMessages.toLocaleString()}
          description={`~${summary.averageMessagesPerSession} per session`}
          icon={MessageSquare}
        />
        <SummaryCard
          title="Tool Calls"
          value={summary.totalToolCalls.toLocaleString()}
          description="Bash, Edit, Read, etc."
          icon={Wrench}
        />
        <SummaryCard
          title="Estimated Cost"
          value={`$${summary.totalCost.toFixed(2)}`}
          description={`${(summary.totalTokens / 1_000_000).toFixed(1)}M tokens`}
          icon={Coins}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DailyActivityChart data={stats.dailyActivity} />
        <HourlyActivityChart data={stats.hourCounts} />
      </div>

      {/* Token Usage */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TokensChart data={stats.dailyModelTokens} />
        <ModelUsageCard data={stats.modelUsage} />
      </div>

      {/* Cost Savings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CostSavingsCard data={stats.modelUsage} />
      </div>
      </div>
    </>
  )
}