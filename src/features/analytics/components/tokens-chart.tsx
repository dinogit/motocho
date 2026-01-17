import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Zap } from 'lucide-react'
import type { StatsCache } from '@/shared/types/analytics'

const chartConfig: ChartConfig = {
  tokens: { label: 'Tokens', color: 'hsl(var(--chart-4))' },
}

interface TokensChartProps {
  data: StatsCache['dailyModelTokens']
}

export function TokensChart({ data }: TokensChartProps) {
  const chartData = data.map((d) => {
    const totalTokens = Object.values(d.tokensByModel).reduce((sum, t) => sum + t, 0)
    return {
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tokens: totalTokens,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Daily Token Usage
        </CardTitle>
        <CardDescription>Tokens consumed per day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => `${Number(value).toLocaleString()} tokens`} />}
            />
            <Line
              type="monotone"
              dataKey="tokens"
              stroke="var(--chart-4)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}