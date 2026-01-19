import * as React from 'react'
import {
  type ErrorComponentProps,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button.tsx'
import {
  Alert as AlertContainer,
  AlertTitle,
  AlertDescription,
} from '@/shared/components/ui/alert.tsx'

export function CatchBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  React.useEffect(() => {
    console.error('CatchBoundary caught an error:', error)
  }, [error])

  const handleRetry = () => {
    reset()
  }

  const handleGoBack = () => {
    window.history.back()
  }

  const handleGoHome = () => {
    router.navigate({ to: '/' })
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[400px] w-full max-w-2xl mx-auto space-y-6">
      <AlertContainer variant="destructive" className="py-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">
          Something went wrong
        </AlertTitle>
        <AlertDescription className="mt-2 text-sm opacity-90">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </AlertDescription>
      </AlertContainer>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="outline" onClick={handleGoBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>

        <Button variant="secondary" onClick={handleRetry} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>

        <Button variant="default" onClick={handleGoHome}>
          Return to Home
        </Button>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="w-full mt-8 p-4 bg-muted rounded-md overflow-auto max-h-[300px] text-xs font-mono">
          <p className="font-bold mb-2 text-muted-foreground uppercase tracking-wider">
            Stack Trace (Dev Only)
          </p>
          <pre className="whitespace-pre-wrap">
            {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
