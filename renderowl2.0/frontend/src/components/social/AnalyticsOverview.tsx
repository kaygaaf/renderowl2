"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  Download,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Music2
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AnalyticsData {
  platform: string
  views: number
  likes: number
  comments: number
  shares: number
  engagement: number
  data: Record<string, any>
}

interface PlatformStats {
  platform: string
  totalViews: number
  totalLikes: number
  totalComments: number
  totalShares: number
  avgEngagement: number
  growth: number
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
}

export function AnalyticsOverview() {
  const [timeRange, setTimeRange] = useState("7d")
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Mock data for now - would fetch from API
      const mockStats: PlatformStats[] = [
        {
          platform: "youtube",
          totalViews: 125000,
          totalLikes: 8500,
          totalComments: 1200,
          totalShares: 450,
          avgEngagement: 8.5,
          growth: 12.3,
        },
        {
          platform: "tiktok",
          totalViews: 250000,
          totalLikes: 15000,
          totalComments: 800,
          totalShares: 2200,
          avgEngagement: 6.8,
          growth: 24.5,
        },
        {
          platform: "instagram",
          totalViews: 75000,
          totalLikes: 6200,
          totalComments: 340,
          totalShares: 180,
          avgEngagement: 9.2,
          growth: -3.2,
        },
      ]
      setPlatformStats(mockStats)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get("/analytics/export", {
        responseType: "blob",
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `analytics_${timeRange}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast({
        title: "Success",
        description: "Analytics exported successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export analytics",
        variant: "destructive",
      })
    }
  }

  const totalViews = platformStats.reduce((acc, s) => acc + s.totalViews, 0)
  const totalLikes = platformStats.reduce((acc, s) => acc + s.totalLikes, 0)
  const totalComments = platformStats.reduce((acc, s) => acc + s.totalComments, 0)
  const totalShares = platformStats.reduce((acc, s) => acc + s.totalShares, 0)
  const avgEngagement = platformStats.length 
    ? platformStats.reduce((acc, s) => acc + s.avgEngagement, 0) / platformStats.length 
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Views
            </CardDescription>
            <CardTitle className="text-2xl">{totalViews.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Total Likes
            </CardDescription>
            <CardTitle className="text-2xl">{totalLikes.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Comments
            </CardDescription>
            <CardTitle className="text-2xl">{totalComments.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Shares
            </CardDescription>
            <CardTitle className="text-2xl">{totalShares.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Breakdown</CardTitle>
          <CardDescription>Performance across all connected platforms</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading analytics...</div>
          ) : platformStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No analytics data available yet
            </div>
          ) : (
            <div className="space-y-4">
              {platformStats.map((stats) => {
                const Icon = platformIcons[stats.platform as keyof typeof platformIcons]
                
                return (
                  <div
                    key={stats.platform}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div className="p-3 rounded-lg bg-muted">
                      {Icon && <Icon className="h-6 w-6" />}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium capitalize">{stats.platform}</p>
                      <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Views</p>
                          <p className="font-medium">{stats.totalViews.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Likes</p>
                          <p className="font-medium">{stats.totalLikes.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Engagement</p>
                          <p className="font-medium">{stats.avgEngagement.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Growth</p>
                          <div className={cn(
                            "flex items-center gap-1",
                            stats.growth >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {stats.growth >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span className="font-medium">{Math.abs(stats.growth)}%</span>
                          </div>
                        </div>
                      </div>
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
