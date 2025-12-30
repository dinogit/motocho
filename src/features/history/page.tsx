import { useState, useCallback, useRef } from 'react'
import { Route } from '@/routes/history'
import { SearchInput } from './components/search-input'
import { ProjectFilter } from './components/project-filter'
import { SearchResultItem } from './components/search-result-item'
import { StatsBar } from './components/stats-bar'
import { searchHistory } from '@/shared/services/history/server-functions'
import type { SearchResult } from '@/shared/services/history/types'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
} from '@/shared/components/page/page-header'

export function Page() {
  const { results: initialResults, projects, stats } = Route.useLoaderData()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [results, setResults] = useState<SearchResult[]>(initialResults)
  const [isSearching, setIsSearching] = useState(false)

  // Use refs to access current values in callbacks without dependencies
  const selectedProjectRef = useRef(selectedProject)
  selectedProjectRef.current = selectedProject
  const searchQueryRef = useRef(searchQuery)
  searchQueryRef.current = searchQuery

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setIsSearching(true)

    try {
      const searchResults = await searchHistory({
        data: {
          query,
          project: selectedProjectRef.current === 'all' ? undefined : selectedProjectRef.current,
          limit: 100,
        },
      })
      setResults(searchResults)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleProjectChange = useCallback(async (project: string) => {
    setSelectedProject(project)
    setIsSearching(true)

    try {
      const searchResults = await searchHistory({
        data: {
          query: searchQueryRef.current,
          project: project === 'all' ? undefined : project,
          limit: 100,
        },
      })
      setResults(searchResults)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const isFiltered = searchQuery.trim() !== '' || selectedProject !== 'all'

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <div>
            <PageTitle>Prompt History</PageTitle>
            <PageDescription>
              Search all prompts across your Claude Code sessions
            </PageDescription>
          </div>
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