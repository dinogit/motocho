import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'

interface SearchInputProps {
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ onChange, placeholder = 'Search prompts...' }: SearchInputProps) {
  const [value, setValue] = useState('')
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue)

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      onChange(newValue)
    }, 300)

    setDebounceTimer(timer)
  }, [onChange, debounceTimer])

  const handleClear = useCallback(() => {
    setValue('')
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    onChange('')
  }, [onChange, debounceTimer])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}