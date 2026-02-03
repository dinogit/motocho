import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Layers } from 'lucide-react'

interface SourceFilterProps {
  value: string
  onChange: (value: string) => void
}

export function SourceFilter({ value, onChange }: SourceFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="All sources" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All sources</SelectItem>
        <SelectItem value="code">Code</SelectItem>
        <SelectItem value="codex">Codex</SelectItem>
      </SelectContent>
    </Select>
  )
}
