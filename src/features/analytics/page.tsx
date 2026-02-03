import { useLoaderData } from '@tanstack/react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { MessageSquare, Coins, Calendar, Wrench } from 'lucide-react'
import type { AnalyticsV2 } from '@/shared/types/analytics-v2'
import { SummaryCard } from './components/summary-card'
import { DailyActivityChart } from './components/v2/daily-activity-chart'
import { HourlyActivityChart } from './components/v2/hourly-activity-chart'
import { TokensChart } from './components/v2/tokens-chart'
import { ModelUsageCard } from './components/v2/model-usage-card'
import {
    PageHeader,
    PageHeaderContent,
    PageTitle,
    PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'

export function Page() {
  const { analytics } = useLoaderData({ from: '/analytics' }) as {
    analytics: AnalyticsV2 | null
  }

  if (!analytics || !analytics.summary || !analytics.summary.totalSessions || analytics.summary.totalSessions === 0) {
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
                We couldn't find any sessions to analyze. Start some conversations to see your stats here!
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    )
  }

  const summary = analytics.summary
  const firstDate = summary.firstSessionDate ? new Date(summary.firstSessionDate) : new Date()

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
            <PageTitle>Analytics</PageTitle>
            <PageHeaderSeparator  />
            <PageDescription>
                Your usage since {firstDate.toLocaleDateString()}
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
          description="Across all sessions"
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
        <DailyActivityChart data={analytics.dailyActivity} />
        <HourlyActivityChart data={analytics.hourlyActivity} />
      </div>

      {/* Token Usage */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TokensChart data={analytics.dailyTokens} />
        <ModelUsageCard data={analytics.modelUsage} />
      </div>
      </div>
    </>
  )
}
