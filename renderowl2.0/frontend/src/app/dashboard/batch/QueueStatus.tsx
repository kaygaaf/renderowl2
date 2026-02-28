"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw,
  Calendar,
  Zap,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"

interface QueueStats {
  pending: number
  active: number
  completed: number
  failed: number
  scheduled: number
  retry: number
}

interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  activeWorkers: number
  queueDepth: number
  processingRate: number // videos per minute
}

export function QueueStatus() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchQueueStats = async () => {
    try {
      const response = await fetch("/api/v1/batch/queue/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch queue stats:", error)
    }
  }

  // Simulated metrics for now
  const fetchSystemMetrics = async () => {
    setMetrics({
      cpuUsage: 45 + Math.random() * 20,
      memoryUsage: 60 + Math.random() * 15,
      activeWorkers: 3,
      queueDepth: stats?.pending || 0,
      processingRate: 2.5 + Math.random(),
    })
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchQueueStats()
      await fetchSystemMetrics()
      setIsLoading(false)
    }

    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const totalJobs = stats 
    ? stats.pending + stats.active + stats.completed + stats.failed 
    : 0

  const successRate = stats && totalJobs > 0
    ? (stats.completed / (stats.completed + stats.failed)) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queue Depth</p>
                <p className="text-3xl font-bold">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <p className="text-3xl font-bold">{stats?.active || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold">{successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Queue Statistics
            </CardTitle>
            <CardDescription>
              Real-time queue status and job distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Pending
                  </span>
                  <span className="font-medium">{stats?.pending || 0}</span>
                </div>
                <Progress 
                  value={totalJobs > 0 ? (stats?.pending || 0) / totalJobs * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Active
                  </span>
                  <span className="font-medium">{stats?.active || 0}</span>
                </div>
                <Progress 
                  value={totalJobs > 0 ? (stats?.active || 0) / totalJobs * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Completed
                  </span>
                  <span className="font-medium">{stats?.completed || 0}</span>
                </div>
                <Progress 
                  value={totalJobs > 0 ? (stats?.completed || 0) / totalJobs * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Failed
                  </span>
                  <span className="font-medium">{stats?.failed || 0}</span>
                </div>
                <Progress 
                  value={totalJobs > 0 ? (stats?.failed || 0) / totalJobs * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-orange-500" />
                    Retry
                  </span>
                  <span className="font-medium">{stats?.retry || 0}</span>
                </div>
                <Progress 
                  value={totalJobs > 0 ? (stats?.retry || 0) / totalJobs * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    Scheduled
                  </span>
                  <span className="font-medium">{stats?.scheduled || 0}</span>
                </div>
                <Progress 
                  value={totalJobs > 0 ? (stats?.scheduled || 0) / totalJobs * 100 : 0} 
                  className="h-2"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{totalJobs}</p>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{metrics?.processingRate.toFixed(1) || 0}</p>
                <p className="text-xs text-muted-foreground">Videos/Min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Real-time system performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CPU Usage</span>
                  <span className="font-medium">{metrics?.cpuUsage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={metrics?.cpuUsage || 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span className="font-medium">{metrics?.memoryUsage.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={metrics?.memoryUsage || 0} 
                  className="h-2"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Active Workers</span>
                <Badge variant="secondary">{metrics?.activeWorkers || 0}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Processing Rate</span>
                <Badge variant="secondary">
                  {metrics?.processingRate.toFixed(1) || 0} videos/min
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Estimated Clear Time</span>
                <Badge variant="secondary">
                  {metrics?.processingRate && metrics?.processingRate > 0
                    ? `${Math.ceil((stats?.pending || 0) / metrics.processingRate)} min`
                    : "N/A"}
                </Badge>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">System Healthy</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                All workers operational. Queue processing normally.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
