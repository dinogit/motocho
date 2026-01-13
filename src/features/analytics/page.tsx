import { useLoaderData } from '@tanstack/react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { MessageSquare, Coins, Calendar, Wrench } from 'lucide-react'
import type { StatsCache, AnalyticsSummary } from '@/shared/services/analytics/types'
import { SummaryCard } from './components/summary-card'
import { DailyActivityChart } from './components/daily-activity-chart'
import { HourlyActivityChart } from './components/hourly-activity-chart'
import { TokensChart } from './components/tokens-chart'
import { ModelUsageCard } from './components/model-usage-card'
import {
    PageHeader,
    PageHeaderContent,
    PageTitle,
    PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'

export function Page() {
  const { stats, summary } = useLoaderData({ from: '/analytics' }) as {
    stats: StatsCache | null
    summary: AnalyticsSummary | null
  }

  if (!stats || !summary || !summary.totalSessions || summary.totalSessions === 0) {
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
                We couldn't find any Claude Code sessions to analyze. Start some conversations with Claude Code to see your stats here!
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    )
  }

  const firstDate = summary.firstSessionDate ? new Date(summary.firstSessionDate) : new Date()

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
            <PageTitle>Analytics</PageTitle>
            <PageHeaderSeparator  />
            <PageDescription>
                Your Claude Code usage since {firstDate.toLocaleDateString()}
            </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-1 flex-col gap-6 p-6">

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Sessions"
          value={(summary.totalSessions || 0).toLocaleString()}
          description={`${summary.daysActive || 0} days active`}
          icon={Calendar}
        />
        <SummaryCard
          title="Total Messages"
          value={(summary.totalMessages || 0).toLocaleString()}
          description={`~${summary.averageMessagesPerSession || 0} per session`}
          icon={MessageSquare}
        />
        <SummaryCard
          title="Tool Calls"
          value={(summary.totalToolCalls || 0).toLocaleString()}
          description="Bash, Edit, Read, etc."
          icon={Wrench}
        />
        <SummaryCard
          title="Estimated Cost"
          value={`$${(summary.totalCost || 0).toFixed(2)}`}
          description={`${((summary.totalTokens || 0) / 1_000_000).toFixed(1)}M tokens`}
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
      </div>
    </>
  )
}