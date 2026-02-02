'use client'

import { useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { getProjects } from '@/shared/services/transcripts/client'
import { useDocs } from '../context/docs-context'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select'

export function StepProject() {
    const { state, dispatch } = useDocs()
    const { projects, selectedProjectId, isLoadingProjects } = state

    useEffect(() => {
        async function loadProjects() {
            try {
                const data = await getProjects()
                dispatch({ type: 'SET_PROJECTS', payload: data })
            } catch (error) {
                console.error('Failed to load projects:', error)
            } finally {
                dispatch({ type: 'SET_LOADING_PROJECTS', payload: false })
            }
        }
        loadProjects()
    }, [dispatch])

    const handleProjectChange = (projectId: string) => {
        dispatch({ type: 'SET_SELECTED_PROJECT', payload: projectId })
        dispatch({ type: 'RESET_SESSIONS' })
        dispatch({ type: 'RESET_RESULT' })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm">Choose a project to generate documentation for</span>
            </div>

            <Select
                value={selectedProjectId}
                onValueChange={handleProjectChange}
                disabled={isLoadingProjects}
            >
                <SelectTrigger className="w-1/2">
                    <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                    {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                            <div className="flex flex-row justify-between w-full space-x-4 items-center">
                                <span>{p.displayName}</span>
                                <span className="text-xs text-muted-foreground">{p.sessionCount} sessions</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {selectedProjectId && (
                <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{projects.find(p => p.id === selectedProjectId)?.displayName}</span>
                </p>
            )}
        </div>
    )
}
