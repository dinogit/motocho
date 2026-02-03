import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Zap } from 'lucide-react'
import type { DailyTokensV2 } from '@/shared/types/analytics-v2'

const chartConfig: ChartConfig = {
  code: { label: 'Code', color: 'hsl(var(--chart-2))' },
  codex: { label: 'Codex', color: 'hsl(var(--chart-4))' },
}

interface TokensChartProps {
  data: DailyTokensV2[]
}

export function TokensChart({ data }: TokensChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    code: d.tokensBySource?.code ?? 0,
    codex: d.tokensBySource?.codex ?? 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Daily Token Usage
        </CardTitle>
        <CardDescription>Tokens consumed per day by source</CardDescription>
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
            <Area
              type="monotone"
              dataKey="code"
              stackId="tokens"
              stroke="var(--chart-2)"
              fill="var(--chart-2)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="codex"
              stackId="tokens"
              stroke="var(--chart-4)"
              fill="var(--chart-4)"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
