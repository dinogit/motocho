'use client'

import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Project, Session } from '@/shared/types/transcripts'
import type { DocAudience } from '@/shared/services/transcripts/client'

// ============================================================================
// Types
// ============================================================================

interface DocsState {
    // Step 1: Project
    projects: Project[]
    selectedProjectId: string
    isLoadingProjects: boolean

    // Step 2: Sessions
    sessions: Session[]
    selectedSessionIds: string[]
    isLoadingSessions: boolean

    // Step 3: Settings
    audience: DocAudience
    customPrompt: string
    defaultPrompt: string
    showPromptEditor: boolean
    isLoadingPrompt: boolean

    // Step 4: Result
    generatedDoc: string | null
    isGenerating: boolean
    copySuccess: boolean
}

type DocsAction =
    | { type: 'SET_PROJECTS'; payload: Project[] }
    | { type: 'SET_SELECTED_PROJECT'; payload: string }
    | { type: 'SET_LOADING_PROJECTS'; payload: boolean }
    | { type: 'SET_SESSIONS'; payload: Session[] }
    | { type: 'TOGGLE_SESSION'; payload: string }
    | { type: 'SET_LOADING_SESSIONS'; payload: boolean }
    | { type: 'SET_AUDIENCE'; payload: DocAudience }
    | { type: 'SET_CUSTOM_PROMPT'; payload: string }
    | { type: 'SET_DEFAULT_PROMPT'; payload: string }
    | { type: 'SET_SHOW_PROMPT_EDITOR'; payload: boolean }
    | { type: 'SET_LOADING_PROMPT'; payload: boolean }
    | { type: 'RESET_PROMPT' }
    | { type: 'SET_GENERATED_DOC'; payload: string | null }
    | { type: 'SET_IS_GENERATING'; payload: boolean }
    | { type: 'SET_COPY_SUCCESS'; payload: boolean }
    | { type: 'RESET_SESSIONS' }
    | { type: 'RESET_RESULT' }

// ============================================================================
// Initial State
// ============================================================================

const initialState: DocsState = {
    projects: [],
    selectedProjectId: '',
    isLoadingProjects: true,

    sessions: [],
    selectedSessionIds: [],
    isLoadingSessions: false,

    audience: 'engineer',
    customPrompt: '',
    defaultPrompt: '',
    showPromptEditor: false,
    isLoadingPrompt: false,

    generatedDoc: null,
    isGenerating: false,
    copySuccess: false,
}

// ============================================================================
// Reducer
// ============================================================================

function docsReducer(state: DocsState, action: DocsAction): DocsState {
    switch (action.type) {
        case 'SET_PROJECTS':
            return { ...state, projects: action.payload }
        case 'SET_SELECTED_PROJECT':
            return { ...state, selectedProjectId: action.payload }
        case 'SET_LOADING_PROJECTS':
            return { ...state, isLoadingProjects: action.payload }
        case 'SET_SESSIONS':
            return { ...state, sessions: action.payload }
        case 'TOGGLE_SESSION':
            return {
                ...state,
                selectedSessionIds: state.selectedSessionIds.includes(action.payload)
                    ? state.selectedSessionIds.filter(id => id !== action.payload)
                    : [...state.selectedSessionIds, action.payload]
            }
        case 'SET_LOADING_SESSIONS':
            return { ...state, isLoadingSessions: action.payload }
        case 'SET_AUDIENCE':
            return { ...state, audience: action.payload }
        case 'SET_CUSTOM_PROMPT':
            return { ...state, customPrompt: action.payload }
        case 'SET_DEFAULT_PROMPT':
            return { ...state, defaultPrompt: action.payload }
        case 'SET_SHOW_PROMPT_EDITOR':
            return { ...state, showPromptEditor: action.payload }
        case 'SET_LOADING_PROMPT':
            return { ...state, isLoadingPrompt: action.payload }
        case 'RESET_PROMPT':
            return { ...state, customPrompt: state.defaultPrompt }
        case 'SET_GENERATED_DOC':
            return { ...state, generatedDoc: action.payload }
        case 'SET_IS_GENERATING':
            return { ...state, isGenerating: action.payload }
        case 'SET_COPY_SUCCESS':
            return { ...state, copySuccess: action.payload }
        case 'RESET_SESSIONS':
            return { ...state, selectedSessionIds: [], sessions: [] }
        case 'RESET_RESULT':
            return { ...state, generatedDoc: null }
        default:
            return state
    }
}

// ============================================================================
// Context
// ============================================================================

interface DocsContextValue {
    state: DocsState
    dispatch: React.Dispatch<DocsAction>
}

const DocsContext = createContext<DocsContextValue | null>(null)

export function DocsProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(docsReducer, initialState)

    return (
        <DocsContext.Provider value={{ state, dispatch }}>
            {children}
        </DocsContext.Provider>
    )
}

export function useDocs() {
    const context = useContext(DocsContext)
    if (!context) {
        throw new Error('useDocs must be used within DocsProvider')
    }
    return context
}

// ============================================================================
// Selectors (for convenience)
// ============================================================================

export function useDocsState() {
    const { state } = useDocs()
    return state
}

export function useDocsDispatch() {
    const { dispatch } = useDocs()
    return dispatch
}

// Computed selectors
export function useSelectedProject() {
    const { state } = useDocs()
    return state.projects.find(p => p.id === state.selectedProjectId)
}

export function useCanProceedToSessions() {
    const { state } = useDocs()
    return !!state.selectedProjectId
}

export function useCanProceedToSettings() {
    const { state } = useDocs()
    return state.selectedSessionIds.length > 0
}

export function useCanGenerate() {
    const { state } = useDocs()
    return state.selectedSessionIds.length > 0 && !state.isGenerating
}

export function useHasCustomPrompt() {
    const { state } = useDocs()
    return state.showPromptEditor && state.customPrompt !== state.defaultPrompt
}
