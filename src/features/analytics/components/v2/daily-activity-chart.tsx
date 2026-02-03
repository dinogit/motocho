import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { DailyActivityV2 } from '@/shared/types/analytics-v2'

const chartConfig: ChartConfig = {
  code: { label: 'Code', color: 'hsl(var(--chart-1))' },
  codex: { label: 'Codex', color: 'hsl(var(--chart-4))' },
  toolCalls: { label: 'Tool Calls', color: 'hsl(var(--chart-5))' },
}

interface DailyActivityChartProps {
  data: DailyActivityV2[]
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  const chartData = data.map((d) => {
    const codeMessages = d.messageCounts?.code ?? 0
    const codexMessages = d.messageCounts?.codex ?? 0
    const toolCalls = (d.toolCallCounts?.code ?? 0) + (d.toolCallCounts?.codex ?? 0)

    return {
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      code: codeMessages,
      codex: codexMessages,
      toolCalls,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Daily Activity
        </CardTitle>
        <CardDescription>Messages by source with tool-call trend</CardDescription>
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
              dataKey="code"
              stackId="messages"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="codex"
              stackId="messages"
              stroke="var(--chart-4)"
              fill="var(--chart-4)"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="toolCalls"
              stroke="var(--chart-5)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
