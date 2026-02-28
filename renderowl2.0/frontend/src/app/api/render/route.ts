import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// In-memory job store (in production, use Redis or database)
const renderJobs = new Map<string, {
  id: string
  timelineId: string
  userId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  outputUrl?: string
  error?: string
  createdAt: string
  updatedAt: string
}>()

// POST /api/render - Start a new render job
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { timelineId, options = {} } = body

    if (!timelineId) {
      return NextResponse.json(
        { error: 'Timeline ID is required' },
        { status: 400 }
      )
    }

    // Create a new render job
    const jobId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    const job = {
      id: jobId,
      timelineId,
      userId,
      status: 'pending' as const,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    }

    renderJobs.set(jobId, job)

    // Start the render process asynchronously
    // In production, this would be a background job (Bull, SQS, etc.)
    startRenderJob(jobId, timelineId, options)

    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Render job started successfully',
    })
  } catch (error) {
    console.error('Error starting render:', error)
    return NextResponse.json(
      { error: 'Failed to start render job' },
      { status: 500 }
    )
  }
}

// GET /api/render?jobId=xxx - Get render job status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = renderJobs.get(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Render job not found' },
        { status: 404 }
      )
    }

    // Ensure user can only access their own jobs
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      outputUrl: job.outputUrl,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })
  } catch (error) {
    console.error('Error getting render status:', error)
    return NextResponse.json(
      { error: 'Failed to get render status' },
      { status: 500 }
    )
  }
}

// DELETE /api/render?jobId=xxx - Cancel a render job
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const job = renderJobs.get(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Render job not found' },
        { status: 404 }
      )
    }

    if (job.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Can only cancel pending or processing jobs
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json(
        { error: 'Cannot cancel a finished job' },
        { status: 400 }
      )
    }

    job.status = 'failed'
    job.error = 'Cancelled by user'
    job.updatedAt = new Date().toISOString()
    renderJobs.set(jobId, job)

    return NextResponse.json({
      jobId,
      status: 'cancelled',
      message: 'Render job cancelled',
    })
  } catch (error) {
    console.error('Error cancelling render:', error)
    return NextResponse.json(
      { error: 'Failed to cancel render job' },
      { status: 500 }
    )
  }
}

// Simulate render process (in production, use Remotion Lambda or local renderer)
async function startRenderJob(
  jobId: string,
  timelineId: string,
  options: {
    resolution?: '1080p' | '720p' | '4k'
    format?: 'mp4' | 'webm' | 'gif'
    quality?: 'high' | 'medium' | 'low'
  } = {}
) {
  const job = renderJobs.get(jobId)
  if (!job) return

  try {
    // Update status to processing
    job.status = 'processing'
    job.updatedAt = new Date().toISOString()
    renderJobs.set(jobId, job)

    // Simulate render progress
    const duration = 30000 // 30 seconds simulated render time
    const steps = 10
    const stepDuration = duration / steps

    for (let i = 1; i <= steps; i++) {
      await sleep(stepDuration)
      
      const currentJob = renderJobs.get(jobId)
      if (!currentJob || currentJob.status === 'failed') {
        // Job was cancelled
        return
      }

      currentJob.progress = i * 10
      currentJob.updatedAt = new Date().toISOString()
      renderJobs.set(jobId, currentJob)
    }

    // Generate output URL (in production, this would be S3/CloudFront URL)
    const outputUrl = `/api/render/output/${jobId}/video.mp4`

    // Mark as completed
    job.status = 'completed'
    job.progress = 100
    job.outputUrl = outputUrl
    job.updatedAt = new Date().toISOString()
    renderJobs.set(jobId, job)

    console.log(`Render job ${jobId} completed for timeline ${timelineId}`)
  } catch (error) {
    console.error(`Render job ${jobId} failed:`, error)
    
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unknown error'
    job.updatedAt = new Date().toISOString()
    renderJobs.set(jobId, job)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
