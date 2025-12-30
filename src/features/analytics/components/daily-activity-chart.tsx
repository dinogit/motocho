import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { StatsCache } from '@/shared/services/analytics/types'

const chartConfig: ChartConfig = {
  messages: { label: 'Messages', color: 'hsl(var(--chart-1))' },
  toolCalls: { label: 'Tool Calls', color: 'hsl(var(--chart-2))' },
}

interface DailyActivityChartProps {
  data: StatsCache['dailyActivity']
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    messages: d.messageCount,
    toolCalls: d.toolCallCount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Daily Activity
        </CardTitle>
        <CardDescription>Messages and tool calls per day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="messages"
              stroke="var(--color-messages)"
              fill="var(--color-messages)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="toolCalls"
              stroke="var(--color-toolCalls)"
              fill="var(--color-toolCalls)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}