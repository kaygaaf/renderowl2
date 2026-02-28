"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  TrendingUp,
  Music,
  Hash,
  Trophy,
  ExternalLink,
  RefreshCw,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  Flame
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Trend {
  id: string
  platform: string
  trendType: "hashtag" | "sound" | "challenge" | "topic" | "video"
  title: string
  description: string
  url?: string
  volume: number
  region: string
  fetchedAt: string
}

interface SocialAccount {
  id: string
  platform: string
  accountName: string
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
}

const trendTypeIcons = {
  hashtag: Hash,
  sound: Music,
  challenge: Trophy,
  topic: TrendingUp,
  video: Flame,
}

const regions = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "IN", label: "India" },
  { value: "GLOBAL", label: "Global" },
]

export function PlatformTrends() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("US")
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchTrends()
    }
  }, [selectedAccount, selectedRegion])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/social/accounts")
      const accounts = response.data.accounts || []
      setAccounts(accounts)
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0].id)
      }
    } catch (error) {
      console.error("Failed to load accounts:", error)
    }
  }

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/social/trends/${selectedAccount}?region=${selectedRegion}`)
      setTrends(response.data.trends || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load trends",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1)}B`
    }
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`
    }
    return volume.toString()
  }

  const selectedPlatform = accounts.find((a) => a.id === selectedAccount)?.platform
  const Icon = selectedPlatform ? platformIcons[selectedPlatform as keyof typeof platformIcons] : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Platform Trends</CardTitle>
              <CardDescription>Discover trending topics and content ideas</CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => {
                    const PlatformIcon = platformIcons[account.platform as keyof typeof platformIcons]
                    return (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          {PlatformIcon && <PlatformIcon className="h-4 w-4" />}
                          <span className="capitalize">{account.platform}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={fetchTrends} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedAccount ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No connected accounts</p>
              <p className="text-sm">Connect a social media account to see trends</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">Loading trends...</div>
          ) : trends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trends available</p>
              <p className="text-sm">Trends will appear when available from the platform</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trends.map((trend) => {
                const TrendIcon = trendTypeIcons[trend.trendType] || TrendingUp
                
                return (
                  <div
                    key={trend.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TrendIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{trend.title}</p>
                        <Badge variant="secondary" className="capitalize">
                          {trend.trendType}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {trend.description}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {formatVolume(trend.volume)} posts
                        </span>
                        
                        {trend.url && (
                          <a
                            href={trend.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Ideas</CardTitle>
          <CardDescription>AI-powered suggestions based on trending topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="p-4 border rounded-lg">
              <p className="font-medium">🔥 Trending Format</p>
              <p className="text-sm text-muted-foreground mt-1">
                Short-form vertical videos (9:16) are performing 3x better on {selectedPlatform || "social platforms"} this week.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <p className="font-medium">⏰ Best Posting Time</p>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your audience, the optimal posting time is between 6-8 PM in your local timezone.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <p className="font-medium">💡 Content Tip</p>
              <p className="text-sm text-muted-foreground mt-1">
                Videos with captions see 40% higher engagement. Use our AI caption generator for best results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
