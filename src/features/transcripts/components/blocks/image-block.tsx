import { ImageIcon } from 'lucide-react'

interface ImageBlockRendererProps {
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export function ImageBlockRenderer({ source }: ImageBlockRendererProps) {
  const dataUrl = `data:${source.media_type};base64,${source.data}`

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        <span>Image</span>
        <span className="ml-auto">{source.media_type}</span>
      </div>
      <img
        src={dataUrl}
        alt="Embedded image"
        className="max-w-full h-auto"
        loading="lazy"
      />
    </div>
  )
}