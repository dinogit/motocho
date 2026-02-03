import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Clock } from 'lucide-react'

const chartConfig: ChartConfig = {
  code: { label: 'Code', color: 'hsl(var(--chart-3))' },
  codex: { label: 'Codex', color: 'hsl(var(--chart-4))' },
}

interface HourlyActivityChartProps {
  data: Record<string, Record<string, number>>
}

export function HourlyActivityChart({ data }: HourlyActivityChartProps) {
  const code = data?.code ?? {}
  const codex = data?.codex ?? {}

  const chartData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    code: code[hour.toString()] || 0,
    codex: codex[hour.toString()] || 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activity by Hour
        </CardTitle>
        <CardDescription>Message volume split by source</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
              interval={2}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="code" stackId="source" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="codex" stackId="source" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
