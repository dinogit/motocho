'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Textarea } from '@/shared/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/shared/lib/utils'

interface DocsEditorProps {
    initialMarkdown: string
    onChange?: (markdown: string) => void
    className?: string
}

export function DocsEditor({ initialMarkdown, onChange, className }: DocsEditorProps) {
    const [markdown, setMarkdown] = useState(initialMarkdown)
    const [activeTab, setActiveTab] = useState<string>('edit')

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setMarkdown(value)
        onChange?.(value)
    }, [onChange])

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className={cn('w-full', className)}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-0">
                <Textarea
                    value={markdown}
                    onChange={handleChange}
                    className="min-h-[500px] font-mono text-sm resize-none border-0 focus-visible:ring-0 rounded-t-none"
                    placeholder="Documentation will appear here..."
                />
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
                <div className="min-h-[500px] p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {markdown}
                    </ReactMarkdown>
                </div>
            </TabsContent>
        </Tabs>
    )
}
