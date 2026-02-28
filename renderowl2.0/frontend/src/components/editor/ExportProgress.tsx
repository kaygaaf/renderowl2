'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, XCircle, Download } from 'lucide-react'

interface ExportProgressProps {
  jobId: string
  onComplete?: () => void
  onError?: (error: string) => void
}

interface JobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  outputUrl?: string
  error?: string
}

export const ExportProgress: React.FC<ExportProgressProps> = ({
  jobId,
  onComplete,
  onError,
}) => {
  const [job, setJob] = useState<JobStatus | null>(null)
  const [isPolling, setIsPolling] = useState(true)

  useEffect(() => {
    if (!jobId || !isPolling) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/render?jobId=${jobId}`)
        if (!response.ok) throw new Error('Failed to fetch status')
        
        const data = await response.json()
        setJob(data)

        if (data.status === 'completed') {
          setIsPolling(false)
          onComplete?.()
        } else if (data.status === 'failed') {
          setIsPolling(false)
          onError?.(data.error || 'Render failed')
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }, 1000)

    return () => clearInterval(pollInterval)
  }, [jobId, isPolling, onComplete, onError])

  const handleCancel = async () => {
    try {
      await fetch(`/api/render?jobId=${jobId}`, { method: 'DELETE' })
      setIsPolling(false)
    } catch (error) {
      console.error('Error cancelling job:', error)
    }
  }

  const handleDownload = () => {
    if (job?.outputUrl) {
      window.open(job.outputUrl, '_blank')
    }
  }

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Initializing...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.status === 'pending' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm">Pending...</span>
            </>
          )}
          {job.status === 'processing' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm">Rendering... {job.progress}%</span>
            </>
          )}
          {job.status === 'completed' && (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Completed!</span>
            </>
          )}
          {job.status === 'failed' && (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">Failed</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(job.status === 'pending' || job.status === 'processing') && (
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {job.status === 'completed' && job.outputUrl && (
            <Button variant="default" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>

      {(job.status === 'pending' || job.status === 'processing') && (
        <Progress value={job.progress} className="h-2" />
      )}

      {job.error && (
        <p className="text-sm text-red-600">{job.error}</p>
      )}
    </div>
  )
}
