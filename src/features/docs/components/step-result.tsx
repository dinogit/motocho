'use client'

import { FileText, Loader2, Copy, CheckCircle2, Download, Sparkles } from 'lucide-react'
import { generateDocumentation } from '@/shared/services/transcripts/client'
import { useDocs, useHasCustomPrompt } from '../context/docs-context'
import { Button } from '@/shared/components/ui/button'
import { DocsEditor } from './docs-editor'

export function StepResult() {
    const { state, dispatch } = useDocs()
    const {
        selectedProjectId,
        selectedSessionIds,
        audience,
        customPrompt,
        defaultPrompt,
        showPromptEditor,
        generatedDoc,
        isGenerating,
        copySuccess,
    } = state

    const hasCustomPrompt = useHasCustomPrompt()

    const handleGenerate = async () => {
        if (selectedSessionIds.length === 0) return

        dispatch({ type: 'SET_IS_GENERATING', payload: true })
        try {
            const promptToUse = hasCustomPrompt ? customPrompt : undefined
            const result = await generateDocumentation(
                selectedProjectId,
                selectedSessionIds,
                true,
                audience,
                promptToUse
            )
            dispatch({ type: 'SET_GENERATED_DOC', payload: result.markdown })
        } catch (error) {
            console.error('Failed to generate documentation:', error)
        } finally {
            dispatch({ type: 'SET_IS_GENERATING', payload: false })
        }
    }

    const handleCopy = async () => {
        if (!generatedDoc) return
        try {
            await navigator.clipboard.writeText(generatedDoc)
            dispatch({ type: 'SET_COPY_SUCCESS', payload: true })
            setTimeout(() => dispatch({ type: 'SET_COPY_SUCCESS', payload: false }), 2000)
        } catch (e) {
            console.error('Failed to copy', e)
        }
    }

    const handleDownload = () => {
        if (!generatedDoc) return
        const blob = new Blob([generatedDoc], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `documentation-${audience}-${new Date().toISOString().split('T')[0]}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleDocChange = (markdown: string) => {
        dispatch({ type: 'SET_GENERATED_DOC', payload: markdown })
    }

    // Not generated yet - show generate button
    if (!generatedDoc) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="text-center space-y-2">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-medium">Ready to Generate</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Generate {audience} documentation from {selectedSessionIds.length} selected session{selectedSessionIds.length !== 1 ? 's' : ''}.
                        {hasCustomPrompt && ' Using your customized prompt.'}
                    </p>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    size="lg"
                    className="gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <FileText className="h-5 w-5" />
                            Generate Documentation
                        </>
                    )}
                </Button>
            </div>
        )
    }

    // Generated - show editor and export options
    return (
        <div className="space-y-4">
            {/* Export Actions */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                    Edit below, then export when ready
                </span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copySuccess ? (
                            <><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Copied!</>
                        ) : (
                            <><Copy className="h-4 w-4 mr-2" /> Copy</>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" /> Download .md
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Regenerate'
                        )}
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <div className="rounded-md border bg-background">
                <DocsEditor
                    initialMarkdown={generatedDoc}
                    onChange={handleDocChange}
                />
            </div>
        </div>
    )
}
