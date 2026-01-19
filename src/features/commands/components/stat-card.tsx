import { getColorConfig, type ColorName } from '../lib/colors'

interface StatCardProps {
  label: string
  value: number
  color: ColorName
  delay: number
}

export function StatCard({ label, value, color, delay }: StatCardProps) {
  const config = getColorConfig(color)

  return (
    <div
      className={`p-4 rounded-lg border ${config.bg} ${config.border} transition-all duration-700 opacity-0 translate-y-4 hover:translate-y-2 hover:-translate-x-1 ${config.glow}`}
      style={{
        animation: `slideUp 0.6s ease-out ${delay}ms forwards`,
      }}
    >
      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-4xl font-bold ${config.text}`}>{value}</p>
    </div>
  )
}
