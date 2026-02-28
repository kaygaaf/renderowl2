"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Music2
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface QueueItem {
  id: string
  postId: string
  title: string
  platform: string
  status: "pending" | "active" | "completed" | "failed" | "delayed"
  scheduledAt: string
  progress?: number
  attempts: number
  maxRetries: number
  error?: string
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
}

const statusIcons = {
  pending: Clock,
  active: Play,
  completed: CheckCircle2,
  failed: XCircle,
  delayed: AlertCircle,
}

const statusColors = {
  pending: "text-yellow-500",
  active: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
  delayed: "text-orange-500",
}

export function PublishingQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stats, setStats] = useState({
    delayed: 0,
    active: 0,
    completed: 0,
    failed: 0,
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchQueue()
    fetchStats()
    
    // Poll for updates
    const interval = setInterval(() => {
      fetchQueue()
      fetchStats()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchQueue = async () => {
    try {
      const response = await api.get("/social/queue")
      setQueue(response.data.queue || [])
    } catch (error) {
      console.error("Failed to load queue:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get("/social/stats")
      setStats(response.data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const handleRetry = async (postId: string) => {
    try {
      await api.post(`/social/retry/${postId}`)
      toast({
        title: "Success",
        description: "Post queued for retry",
      })
      fetchQueue()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry post",
        variant: "destructive",
      })
    }
  }

  const handleCancel = async (postId: string) => {
    try {
      await api.delete(`/social/schedule/${postId}`)
      toast({
        title: "Success",
        description: "Post cancelled",
      })
      fetchQueue()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel post",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{stats.delayed}</CardTitle>
            <CardDescription>Scheduled</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{stats.active}</CardTitle>
            <CardDescription>Publishing</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{stats.completed}</CardTitle>
            <CardDescription>Completed</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{stats.failed}</CardTitle>
            <CardDescription>Failed</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publishing Queue</CardTitle>
          <CardDescription>Real-time status of your publishing queue</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in queue</p>
              <p className="text-sm">Your scheduled posts will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => {
                const Icon = platformIcons[item.platform as keyof typeof platformIcons]
                const StatusIcon = statusIcons[item.status]
                const statusColor = statusColors[item.status]
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div className={cn("p-2 rounded-lg bg-muted", statusColor)}>
                      {Icon && <Icon className="h-5 w-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <StatusIcon className="h-3 w-3" />
                        <span className="capitalize">{item.status}</span>
                        <span>•</span>
                        <span>
                          {item.scheduledAt 
                            ? format(new Date(item.scheduledAt), "PPp")
                            : "Not scheduled"
                          }
                        </span>
                        {item.attempts > 0 && (
                          <>
                            <span>•</span>
                            <span>Attempt {item.attempts}/{item.maxRetries}</span>
                          </>
                        )}
                      </div>
                      
                      {item.status === "active" && item.progress !== undefined && (
                        <Progress value={item.progress} className="h-1 mt-2" />
                      )}
                      
                      {item.error && (
                        <p className="text-sm text-red-500 mt-1">{item.error}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(item.postId)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {(item.status === "pending" || item.status === "delayed") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(item.postId)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
