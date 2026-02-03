'use client'

import { useEffect } from 'react'
import { Loader2, FileText } from 'lucide-react'
import { getCodexProjectSessions, getCodexProjects, getProjectSessions, getProjects } from '@/shared/services/transcripts/client'
import { useDocs } from '../context/docs-context'
import { SessionList } from '@/features/transcripts/components/session-list'

export function StepSessions() {
    const { state, dispatch } = useDocs()
    const { selectedProjectId, sessions, selectedSessionIds, isLoadingSessions } = state

    useEffect(() => {
        if (!selectedProjectId) return

        async function loadSessions() {
            dispatch({ type: 'SET_LOADING_SESSIONS', payload: true })
            try {
                const selectedProject = state.projects.find(p => p.id === selectedProjectId)
                const projectPath = selectedProject?.path

                const [codeProjects, codexProjects] = await Promise.all([
                    getProjects(),
                    getCodexProjects(),
                ])

                const codeProject = projectPath
                    ? codeProjects.find(p => p.path === projectPath)
                    : codeProjects.find(p => p.id === selectedProjectId)

                const codexProject = projectPath
                    ? codexProjects.find(p => p.path === projectPath)
                    : codexProjects.find(p => p.id === selectedProjectId)

                const [codeSessions, codexSessions] = await Promise.all([
                    codeProject ? getProjectSessions(codeProject.id) : Promise.resolve([]),
                    codexProject ? getCodexProjectSessions(codexProject.id) : Promise.resolve([]),
                ])

                const merged = [
                    ...codeSessions.map(s => ({ ...s, source: 'code' as const })),
                    ...codexSessions.map(s => ({ ...s, source: 'codex' as const })),
                ].sort((a, b) => Number(b.lastModified) - Number(a.lastModified))

                dispatch({ type: 'SET_SESSIONS', payload: merged })
            } catch (error) {
                console.error('Failed to load sessions:', error)
            } finally {
                dispatch({ type: 'SET_LOADING_SESSIONS', payload: false })
            }
        }
        loadSessions()
    }, [selectedProjectId, dispatch, state.projects])

    const handleToggleSelection = (sessionId: string) => {
        dispatch({ type: 'TOGGLE_SESSION', payload: sessionId })
    }

    if (!selectedProjectId) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p>Please select a project first</p>
            </div>
        )
    }

    if (isLoadingSessions) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                    Select sessions to include in documentation
                </span>
                <span className="text-sm font-medium">
                    {selectedSessionIds.length} selected
                </span>
            </div>

            <SessionList
                sessions={sessions}
                projectId={selectedProjectId}
                mode="selectable"
                selectedSessionIds={selectedSessionIds}
                onToggleSelection={handleToggleSelection}
            />

            {selectedSessionIds.length === 0 && sessions.length > 0 && (
                <p className="text-sm text-amber-500">
                    Select at least one session to continue
                </p>
            )}
        </div>
    )
}
