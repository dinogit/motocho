import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

interface SummaryCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
}

export function SummaryCard({ title, value, description, icon: Icon }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-chart-1" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}