/**
 * Shared color configuration for commands feature components
 */

export type ColorName = 'sky' | 'amber' | 'emerald' | 'violet' | 'rose' | 'cyan'

export interface ColorConfig {
  bg: string
  border: string
  text: string
  glow: string
}

export const colorConfig: Record<ColorName, ColorConfig> = {
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-700 dark:text-sky-400',
    glow: 'hover:shadow-lg hover:shadow-sky-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-700 dark:text-amber-400',
    glow: 'hover:shadow-lg hover:shadow-amber-500/20',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    glow: 'hover:shadow-lg hover:shadow-emerald-500/20',
  },
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    text: 'text-violet-700 dark:text-violet-400',
    glow: 'hover:shadow-lg hover:shadow-violet-500/20',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-700 dark:text-rose-400',
    glow: 'hover:shadow-lg hover:shadow-rose-500/20',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-700 dark:text-cyan-400',
    glow: 'hover:shadow-lg hover:shadow-cyan-500/20',
  },
}

export function getColorConfig(color: string): ColorConfig {
  return colorConfig[color as ColorName] || colorConfig.sky
}
