import { useState, useCallback, useRef } from 'react'
import { Link, useRouter, useLoaderData } from '@tanstack/react-router'
import { SearchInput } from './components/search-input'
import { ProjectFilter } from './components/project-filter'
import { SearchResultItem } from './components/search-result-item'
import { StatsBar } from './components/stats-bar'
import { SourceFilter } from './components/source-filter'
const checkServerStatus: any = () => Promise.resolve()
const toggleMcpServer: any = () => Promise.resolve()
const copyMcpToProject: any = () => Promise.resolve()
import { searchCodexHistory, searchHistory } from '@/shared/services/history/client'
import type { SearchResult } from '@/shared/types/history'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'

export function Page() {
  const { results: initialResults, projects, stats } = useLoaderData({ from: '/history', structuralSharing: false }) as any

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedSource, setSelectedSource] = useState<'all' | 'code' | 'codex'>('all')
  const [results, setResults] = useState<SearchResult[]>(initialResults)
  const [isSearching, setIsSearching] = useState(false)

  // Use refs to access current values in callbacks without dependencies
  const selectedProjectRef = useRef(selectedProject)
  selectedProjectRef.current = selectedProject
  const searchQueryRef = useRef(searchQuery)
  searchQueryRef.current = searchQuery
  const selectedSourceRef = useRef(selectedSource)
  selectedSourceRef.current = selectedSource

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setIsSearching(true)

    try {
      const [codeResults, codexResults] = await Promise.all([
        searchHistory(
          query,
          selectedProjectRef.current === 'all' ? undefined : selectedProjectRef.current,
          100,
        ),
        searchCodexHistory(
          query,
          selectedProjectRef.current === 'all' ? undefined : selectedProjectRef.current,
          100,
        ),
      ])

      const merged = [...codeResults, ...codexResults].sort(
        (a, b) => b.entry.timestamp - a.entry.timestamp
      )

      const filtered = selectedSourceRef.current === 'all'
        ? merged
        : merged.filter(r => r.entry.source === selectedSourceRef.current)

      setResults(filtered)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleProjectChange = useCallback(async (project: string) => {
    setSelectedProject(project)
    setIsSearching(true)

    try {
      const [codeResults, codexResults] = await Promise.all([
        searchHistory(
          searchQueryRef.current,
          project === 'all' ? undefined : project,
          100,
        ),
        searchCodexHistory(
          searchQueryRef.current,
          project === 'all' ? undefined : project,
          100,
        ),
      ])

      const merged = [...codeResults, ...codexResults].sort(
        (a, b) => b.entry.timestamp - a.entry.timestamp
      )

      const filtered = selectedSourceRef.current === 'all'
        ? merged
        : merged.filter(r => r.entry.source === selectedSourceRef.current)

      setResults(filtered)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSourceChange = useCallback(async (source: 'all' | 'code' | 'codex') => {
    setSelectedSource(source)
    setIsSearching(true)

    try {
      const [codeResults, codexResults] = await Promise.all([
        searchHistory(
          searchQueryRef.current,
          selectedProjectRef.current === 'all' ? undefined : selectedProjectRef.current,
          100,
        ),
        searchCodexHistory(
          searchQueryRef.current,
          selectedProjectRef.current === 'all' ? undefined : selectedProjectRef.current,
          100,
        ),
      ])

      const merged = [...codeResults, ...codexResults].sort(
        (a, b) => b.entry.timestamp - a.entry.timestamp
      )

      const filtered = source === 'all'
        ? merged
        : merged.filter(r => r.entry.source === source)

      setResults(filtered)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const isFiltered = searchQuery.trim() !== '' || selectedProject !== 'all' || selectedSource !== 'all'

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Prompt History</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            Search all prompts across your Claude Code sessions
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <div className="flex flex-col gap-6 p-6">
        {stats && (
          <StatsBar
            stats={stats}
            resultCount={results.length}
            isFiltered={isFiltered}
          />
        )}

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[250px]">
            <SearchInput
              onChange={handleSearch}
              placeholder="Search prompts..."
            />
          </div>
          <ProjectFilter
            projects={projects}
            value={selectedProject}
            onChange={handleProjectChange}
          />
          <SourceFilter
            value={selectedSource}
            onChange={(value) => handleSourceChange(value as 'all' | 'code' | 'codex')}
          />
        </div>

        <div className="flex flex-col gap-3">
          {isSearching ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No prompts found</p>
              {isFiltered && (
                <p className="text-sm mt-1">Try adjusting your search or filter</p>
              )}
            </div>
          ) : (
            results.map((result, index) => (
              <SearchResultItem
                key={`${result.entry.sessionId}-${result.entry.timestamp}-${index}`}
                result={result}
                query={searchQuery}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
