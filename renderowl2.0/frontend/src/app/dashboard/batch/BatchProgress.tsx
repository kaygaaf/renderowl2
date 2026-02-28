"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ChevronRight,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface Batch {
  id: string
  name: string
  status: string
  totalVideos: number
  completed: number
  failed: number
  inProgress: number
  progress: number
  createdAt: string
  updatedAt: string
}

interface BatchProgressProps {
  batches: Batch[]
  selectedBatch: Batch | null
  onSelectBatch: (batch: Batch) => void
  onViewResults: (batch: Batch) => void
}

export function BatchProgress({ 
  batches, 
  selectedBatch, 
  onSelectBatch,
  onViewResults 
}: BatchProgressProps) {
  const [progressData, setProgressData] = useState<Record<string, any>>({})

  const fetchProgress = async (batchId: string) => {
    try {
      const response = await fetch(`/api/v1/batch/${batchId}/status`)
      if (response.ok) {
        const data = await response.json()
        setProgressData((prev) => ({ ...prev, [batchId]: data }))
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error)
    }
  }

  useEffect(() => {
    batches.forEach((batch) => {
      if (batch.status === "processing" || batch.status === "queued") {
        fetchProgress(batch.id)
      }
    })
  }, [batches])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case "queued":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "cancelled":
        return <X className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      queued: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      failed: "bg-red-500/10 text-red-500 border-red-500/20",
      cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    }
    
    return (
      <Badge variant="outline" className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleCancel = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/v1/batch/${batchId}/cancel`, {
        method: "POST",
      })
      if (response.ok) {
        toast.success("Batch cancelled")
      } else {
        toast.error("Failed to cancel batch")
      }
    } catch (error) {
      toast.error("Failed to cancel batch")
    }
  }

  const handleRetry = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/v1/batch/${batchId}/retry`, {
        method: "POST",
      })
      if (response.ok) {
        toast.success("Retrying failed videos")
      } else {
        toast.error("Failed to retry")
      }
    } catch (error) {
      toast.error("Failed to retry")
    }
  }

  const activeBatches = batches.filter(
    (b) => b.status === "processing" || b.status === "queued" || b.status === "pending"
  )
  const completedBatches = batches.filter(
    (b) => b.status === "completed" || b.status === "failed" || b.status === "cancelled"
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Active Batches</CardTitle>
            <CardDescription>
              {activeBatches.length} batch{activeBatches.length !== 1 ? "es" : ""} running
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {activeBatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No active batches
                  </p>
                ) : (
                  activeBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBatch?.id === batch.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => onSelectBatch(batch)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(batch.status)}
                          <span className="font-medium truncate max-w-[150px]">
                            {batch.name}
                          </span>
                        </div>
                        {getStatusBadge(batch.status)}
                      </div>
                      
                      <div className="mt-2">
                        <Progress value={batch.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{batch.completed}/{batch.totalVideos} videos</span>
                          <span>{Math.round(batch.progress)}%</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 mt-2">
                        {(batch.status === "processing" || batch.status === "queued") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => handleCancel(batch.id, e)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed Batches</CardTitle>
            <CardDescription>
              {completedBatches.length} completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {completedBatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No completed batches
                  </p>
                ) : (
                  completedBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedBatch?.id === batch.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => onSelectBatch(batch)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(batch.status)}
                          <span className="font-medium truncate max-w-[150px]">
                            {batch.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onViewResults(batch)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {batch.completed}/{batch.totalVideos} completed
                        </span>
                        {batch.failed > 0 && (
                          <span className="text-red-500">{batch.failed} failed</span>
                        )}
                      </div>
                      
                      {batch.failed > 0 && batch.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 mt-2"
                          onClick={(e) => handleRetry(batch.id, e)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry Failed
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {selectedBatch ? (
          <BatchDetail 
            batch={selectedBatch} 
            progressData={progressData[selectedBatch.id]}
          />
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Select a Batch</h3>
              <p className="text-muted-foreground">
                Choose a batch from the list to view detailed progress
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

interface BatchDetailProps {
  batch: Batch
  progressData: any
}

function BatchDetail({ batch, progressData }: BatchDetailProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{batch.name}</CardTitle>
            <CardDescription>
              Created {new Date(batch.createdAt).toLocaleString()}
            </CardDescription>
          </div>
          <Badge 
            variant={batch.status === "completed" ? "default" : "outline"}
            className={
              batch.status === "completed" 
                ? "bg-green-500" 
                : batch.status === "failed"
                ? "border-red-500 text-red-500"
                : ""
            }
          >
            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{batch.totalVideos}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-500">{batch.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-blue-500">{batch.inProgress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-red-500">{batch.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{Math.round(batch.progress)}%</span>
          </div>
          <Progress value={batch.progress} className="h-3" />
        </div>

        {progressData?.currentVideo && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Currently processing: {progressData.currentVideo}</span>
            </div>
            {progressData.eta && (
              <div className="text-xs text-muted-foreground mt-1">
                ETA: {progressData.eta}
              </div>
            )}
          </div>
        )}

        <Separator />

        <div>
          <h4 className="font-medium mb-4">Batch Settings</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Script Style:</span>
              <span className="ml-2 capitalize">{progressData?.scriptStyle || "educational"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Parallel Processing:</span>
              <span className="ml-2">{progressData?.parallelProcessing ? "Enabled" : "Disabled"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max Concurrent:</span>
              <span className="ml-2">{progressData?.maxConcurrent || 3}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Retry Attempts:</span>
              <span className="ml-2">{progressData?.retryAttempts || 2}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
