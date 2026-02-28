"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  Loader2
} from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

// Types
interface AnalyticsOverview {
  period: string
  total_views: number
  views_by_platform: Record<string, number>
  total_videos: number
  avg_engagement_rate: number
  daily_views: DailyView[]
  top_videos: VideoMetric[]
}

interface DailyView {
  date: string
  total: number
  by_platform: Record<string, number>
}

interface VideoMetric {
  video_id: string
  title: string
  thumbnail?: string
  views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  platforms: string[]
  published_at?: string
}

interface PlatformData {
  platform: string
  views: number
  percentage: number
  videos: number
  followers: number
}

interface EngagementMetrics {
  total_likes: number
  total_comments: number
  total_shares: number
  total_saves: number
  engagement_rate: number
  by_platform: Record<string, PlatformEngagement>
}

interface PlatformEngagement {
  likes: number
  comments: number
  shares: number
  rate: number
}

interface UserGrowthData {
  date: string
  new_signups: number
  active_users: number
  returning_users: number
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState("30")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [platforms, setPlatforms] = useState<PlatformData[]>([])
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null)
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([])

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      const days = parseInt(timeRange)
      
      // Fetch all analytics data in parallel
      const [overviewRes, platformsRes, engagementRes, growthRes] = await Promise.all([
        apiClient.get(`/analytics/overview?days=${days}`),
        apiClient.get(`/analytics/platforms?days=${days}`),
        apiClient.get(`/analytics/engagement?days=${days}`),
        apiClient.get(`/analytics/growth?days=${days}`),
      ])
      
      setOverview(overviewRes.data)
      setPlatforms(platformsRes.data.platforms || [])
      setEngagement(engagementRes.data)
      setUserGrowth(growthRes.data.data || [])
    } catch (err) {
      console.error("Failed to fetch analytics:", err)
      setError("Failed to load analytics data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: string) => {
    try {
      const response = await apiClient.get(`/analytics/export?format=${format}`, {
        responseType: "blob",
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `analytics.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  // Helper to format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Helper to format percentage
  const formatPercent = (num: number): string => {
    return `${num.toFixed(2)}%`
  }

  // Get platform icon/color
  const getPlatformStyle = (platform: string) => {
    const styles: Record<string, { color: string; bg: string }> = {
      youtube: { color: "text-red-600", bg: "bg-red-50" },
      tiktok: { color: "text-black", bg: "bg-gray-100" },
      instagram: { color: "text-pink-600", bg: "bg-pink-50" },
      facebook: { color: "text-blue-600", bg: "bg-blue-50" },
      twitter: { color: "text-sky-500", bg: "bg-sky-50" },
    }
    return styles[platform.toLowerCase()] || { color: "text-gray-600", bg: "bg-gray-50" }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchAnalyticsData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Analytics</h1>
                <p className="text-sm text-muted-foreground">
                  Track your video performance across all platforms
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExport("json")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Views
                </CardTitle>
                <Eye className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatNumber(overview?.total_views || 0)}
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5% from last period
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Engagement Rate
                </CardTitle>
                <Heart className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatPercent(overview?.avg_engagement_rate || 0)}
                </div>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +2.3% from last period
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Videos
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatNumber(overview?.total_videos || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Published this period
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Engagement
                </CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatNumber(
                    (engagement?.total_likes || 0) + 
                    (engagement?.total_comments || 0) + 
                    (engagement?.total_shares || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Likes, comments & shares
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Views Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Views Over Time</CardTitle>
                  <CardDescription>Daily views across all platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <ViewsChart data={overview?.daily_views || []} />
                </CardContent>
              </Card>

              {/* Platform Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Distribution</CardTitle>
                  <CardDescription>Views by platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <PlatformPieChart data={platforms} />
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Videos */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Videos</CardTitle>
                <CardDescription>Your best performing content this period</CardDescription>
              </CardHeader>
              <CardContent>
                <VideoPerformanceTable videos={overview?.top_videos || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Breakdown</CardTitle>
                <CardDescription>Performance metrics by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {platforms.map((platform) => {
                    const style = getPlatformStyle(platform.platform)
                    return (
                      <Card key={platform.platform} className="border-l-4 border-l-current">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold capitalize">{platform.platform}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.color}`}>
                              {platform.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Views</span>
                              <span className="font-medium">{formatNumber(platform.views)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Videos</span>
                              <span className="font-medium">{platform.videos}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Followers</span>
                              <span className="font-medium">{formatNumber(platform.followers)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Video Performance</CardTitle>
                <CardDescription>Detailed performance for all your videos</CardDescription>
              </CardHeader>
              <CardContent>
                <VideoPerformanceTable videos={overview?.top_videos || []} showAll />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Likes</CardTitle>
                  <Heart className="h-4 w-4 text-pink-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(engagement?.total_likes || 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Comments</CardTitle>
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(engagement?.total_comments || 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Shares</CardTitle>
                  <Share2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(engagement?.total_shares || 0)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saves</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(engagement?.total_saves || 0)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Engagement by Platform</CardTitle>
                <CardDescription>Breakdown of engagement metrics across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementTable data={engagement?.by_platform || {}} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Views Chart Component
function ViewsChart({ data }: { data: DailyView[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const maxViews = Math.max(...data.map(d => d.total), 1)
  
  return (
    <div className="h-64 flex items-end gap-2">
      {data.slice(-14).map((day, i) => (
        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-blue-600 rounded-t transition-all hover:bg-blue-700"
            style={{ height: `${(day.total / maxViews) * 100}%`, minHeight: day.total > 0 ? 4 : 0 }}
          />
          <span className="text-xs text-muted-foreground">
            {new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
          </span>
        </div>
      ))}
    </div>
  )
}

// Platform Pie Chart Component
function PlatformPieChart({ data }: { data: PlatformData[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No platform data available
      </div>
    )
  }

  const colors: Record<string, string> = {
    youtube: "#ef4444",
    tiktok: "#000000",
    instagram: "#ec4899",
    facebook: "#3b82f6",
    twitter: "#0ea5e9",
  }

  const total = data.reduce((sum, p) => sum + p.views, 0)
  let cumulativePercent = 0

  return (
    <div className="h-64 flex items-center justify-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {data.map((platform, i) => {
            const percent = (platform.views / total) * 100
            const startAngle = (cumulativePercent / 100) * 360
            const endAngle = ((cumulativePercent + percent) / 100) * 360
            
            const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180)
            const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180)
            const x2 = 50 + 40 * Math.cos((Math.PI * endAngle) / 180)
            const y2 = 50 + 40 * Math.sin((Math.PI * endAngle) / 180)
            
            const largeArc = percent > 50 ? 1 : 0
            
            cumulativePercent += percent
            
            return (
              <path
                key={platform.platform}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[platform.platform.toLowerCase()] || "#9ca3af"}
                stroke="white"
                strokeWidth="2"
              />
            )
          })}
          <circle cx="50" cy="50" r="25" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{data.length}</span>
          <span className="text-xs text-muted-foreground">Platforms</span>
        </div>
      </div>
      <div className="ml-8 space-y-2">
        {data.map((platform) => (
          <div key={platform.platform} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[platform.platform.toLowerCase()] || "#9ca3af" }}
            />
            <span className="text-sm capitalize">{platform.platform}</span>
            <span className="text-sm text-muted-foreground">({platform.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Video Performance Table Component
function VideoPerformanceTable({ videos, showAll = false }: { videos: VideoMetric[]; showAll?: boolean }) {
  const displayVideos = showAll ? videos : videos.slice(0, 5)

  if (!displayVideos.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No video data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Video</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Views</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Likes</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Comments</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Shares</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Engagement</th>
            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Platforms</th>
          </tr>
        </thead>
        <tbody>
          {displayVideos.map((video) => (
            <tr key={video.video_id} className="border-b hover:bg-muted/50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium truncate max-w-[200px]">{video.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {video.published_at ? new Date(video.published_at).toLocaleDateString() : "Draft"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="text-right py-3 px-4 font-medium">{video.views.toLocaleString()}</td>
              <td className="text-right py-3 px-4">{video.likes.toLocaleString()}</td>
              <td className="text-right py-3 px-4">{video.comments.toLocaleString()}</td>
              <td className="text-right py-3 px-4">{video.shares.toLocaleString()}</td>
              <td className="text-right py-3 px-4">
                <span className={`font-medium ${video.engagement_rate > 5 ? "text-green-600" : "text-amber-600"}`}>
                  {video.engagement_rate.toFixed(2)}%
                </span>
              </td>
              <td className="text-center py-3 px-4">
                <div className="flex justify-center gap-1">
                  {video.platforms?.slice(0, 3).map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-0.5 bg-gray-100 rounded text-xs capitalize"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Engagement Table Component
function EngagementTable({ data }: { data: Record<string, PlatformEngagement> }) {
  const platforms = Object.entries(data)

  if (!platforms.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No engagement data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Platform</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Likes</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Comments</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Shares</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Rate</th>
          </tr>
        </thead>
        <tbody>
          {platforms.map(([platform, metrics]) => (
            <tr key={platform} className="border-b hover:bg-muted/50">
              <td className="py-3 px-4 font-medium capitalize">{platform}</td>
              <td className="text-right py-3 px-4">{metrics.likes.toLocaleString()}</td>
              <td className="text-right py-3 px-4">{metrics.comments.toLocaleString()}</td>
              <td className="text-right py-3 px-4">{metrics.shares.toLocaleString()}</td>
              <td className="text-right py-3 px-4">
                <span className={`font-medium ${metrics.rate > 5 ? "text-green-600" : "text-amber-600"}`}>
                  {metrics.rate.toFixed(2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
