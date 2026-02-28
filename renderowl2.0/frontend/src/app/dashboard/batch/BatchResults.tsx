"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Download,
  Eye,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Film,
  Clock,
  Play,
  Share2,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

interface Batch {
  id: string
  name: string
  status: string
  totalVideos: number
  completed: number
  failed: number
  createdAt: string
}

interface VideoResult {
  id: string
  title: string
  status: string
  timelineId?: string
  videoUrl?: string
  thumbnailUrl?: string
  duration: number
  renderTime: number
  error?: string
}

interface BatchResultsProps {
  batch: Batch | null
  onBack: () => void
}

export function BatchResults({ batch, onBack }: BatchResultsProps) {
  const [results, setResults] = useState<VideoResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null)

  useEffect(() => {
    if (batch) {
      fetchResults()
    }
  }, [batch])

  const fetchResults = async () => {
    if (!batch) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/batch/${batch.id}/results`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.videos || [])
      }
    } catch (error) {
      console.error("Failed to fetch results:", error)
      toast.error("Failed to load results")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const handleDownload = (video: VideoResult) => {
    if (video.videoUrl) {
      window.open(video.videoUrl, "_blank")
    } else {
      toast.error("Video not available for download")
    }
  }

  const handleViewInEditor = (video: VideoResult) => {
    if (video.timelineId) {
      window.open(`/editor?timeline=${video.timelineId}`, "_blank")
    } else {
      toast.error("Timeline not available")
    }
  }

  const handlePublish = async (video: VideoResult) => {
    toast.info("Opening publish dialog...")
    // Would open publish dialog
  }

  const completedVideos = results.filter((v) => v.status === "completed")
  const failedVideos = results.filter((v) => v.status === "failed")
  
  const totalRenderTime = results.reduce((acc, v) => acc + (v.renderTime || 0), 0)
  const avgRenderTime = completedVideos.length > 0 
    ? totalRenderTime / completedVideos.length 
    : 0

  if (!batch) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <div className="text-center">
          <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Batch Selected</h3>
          <p className="text-muted-foreground">Select a batch to view results</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Progress
        </Button>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {completedVideos.length} / {batch.totalVideos} Complete
          </Badge>
          <Button onClick={fetchResults} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-500">
              {completedVideos.length}
            </div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-500">
              {failedVideos.length}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">
              {Math.round(avgRenderTime)}s
            </div>
            <div className="text-xs text-muted-foreground">Avg Render Time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">
              {Math.round(totalRenderTime / 60)}m
            </div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Videos</CardTitle>
          <CardDescription>
            {batch.name} • Created {new Date(batch.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Render Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {isLoading ? "Loading..." : "No results available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>{getStatusIcon(video.status)}</TableCell>
                      <TableCell className="font-medium">
                        {video.title}
                        {video.error && (
                          <div className="text-xs text-red-500 mt-1">{video.error}</div>
                        )}
                      </TableCell>
                      <TableCell>{video.duration}s</TableCell>
                      <TableCell>{video.renderTime}s</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {video.status === "completed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewInEditor(video)}
                                title="Open in Editor"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(video)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePublish(video)}
                                title="Publish"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {completedVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={() => toast.info("Creating variations...")}>
                Create Short Variations
              </Button>
              <Button variant="outline" onClick={() => toast.info("Generating thumbnails...")}>
                Generate Thumbnails
              </Button>
              <Button variant="outline" onClick={() => toast.info("Opening bulk publish...")}>
                Bulk Publish
              </Button>
              <Button variant="outline" onClick={() => toast.info("Starting A/B test...")}>
                A/B Test Titles
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
