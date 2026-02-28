"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  Share2, 
  Youtube, 
  Instagram, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Calendar,
  Clock,
  Globe,
  Loader2,
  CheckCircle2,
  X
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { api } from "@/lib/api"

interface SocialAccount {
  id: string
  platform: string
  username: string
  avatar?: string
  isConnected: boolean
}

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string
  videoUrl?: string
  videoTitle: string
  videoDescription?: string
  thumbnailUrl?: string
}

const platforms = [
  { id: "youtube", name: "YouTube", icon: Youtube, color: "#FF0000" },
  { id: "tiktok", name: "TikTok", icon: Instagram, color: "#000000" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F" },
  { id: "twitter", name: "X (Twitter)", icon: Twitter, color: "#000000" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "#1877F2" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
]

export function PublishModal({ 
  isOpen, 
  onClose, 
  videoId, 
  videoUrl,
  videoTitle,
  videoDescription,
  thumbnailUrl 
}: PublishModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("now")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(true)
  
  // Form state
  const [title, setTitle] = useState(videoTitle || "")
  const [description, setDescription] = useState(videoDescription || "")
  const [tags, setTags] = useState("")
  const [privacy, setPrivacy] = useState("public")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [isCrossPost, setIsCrossPost] = useState(false)

  // Fetch connected accounts on open
  const fetchAccounts = useCallback(async () => {
    if (!isOpen) return
    
    setIsFetchingAccounts(true)
    try {
      const response = await api.get("/social/accounts")
      setAccounts(response.data.accounts || [])
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
      toast.error("Failed to load social accounts")
    } finally {
      setIsFetchingAccounts(false)
    }
  }, [isOpen])

  useState(() => {
    fetchAccounts()
  })

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const getPlatformAccounts = (platformId: string) => {
    return accounts.filter(acc => acc.platform === platformId && acc.isConnected)
  }

  const handlePublishNow = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform")
      return
    }

    setIsLoading(true)
    try {
      const platformAccounts = selectedPlatforms.flatMap(platformId => 
        getPlatformAccounts(platformId).map(acc => acc.id)
      )

      if (platformAccounts.length === 0) {
        toast.error("No connected accounts for selected platforms")
        return
      }

      const response = await api.post("/social/cross-post", {
        accountIds: platformAccounts,
        videoPath: videoUrl || videoId,
        title,
        description,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        privacy
      })

      toast.success("Video published successfully!")
      onClose()
      
      // Redirect to analytics
      router.push("/dashboard/analytics")
    } catch (error) {
      console.error("Failed to publish:", error)
      toast.error("Failed to publish video")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform")
      return
    }

    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select date and time")
      return
    }

    setIsLoading(true)
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      
      const platformPosts = selectedPlatforms.flatMap(platformId => 
        getPlatformAccounts(platformId).map(acc => ({
          accountId: acc.id,
          platform: platformId,
          title: platformId === "youtube" ? title : `${title.slice(0, 100)}...`,
          description: platformId === "twitter" ? description.slice(0, 280) : description,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          privacy
        }))
      )

      await api.post("/social/schedule", {
        videoId,
        title,
        description,
        platforms: platformPosts,
        scheduledAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })

      toast.success("Video scheduled successfully!")
      onClose()
      router.push("/dashboard/analytics")
    } catch (error) {
      console.error("Failed to schedule:", error)
      toast.error("Failed to schedule video")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectPlatform = (platformId: string) => {
    // Open OAuth flow for the platform
    api.get(`/social/auth/${platformId}`).then(response => {
      window.open(response.data.url, "_blank", "width=600,height=700")
    }).catch(() => {
      toast.error(`Failed to connect to ${platformId}`)
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Publish Video
          </DialogTitle>
          <DialogDescription>
            Share your video across multiple platforms
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="now">Publish Now</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="now" className="space-y-4 mt-4">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>Select Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => {
                  const PlatformIcon = platform.icon
                  const isSelected = selectedPlatforms.includes(platform.id)
                  const connectedAccounts = getPlatformAccounts(platform.id)
                  const hasAccount = connectedAccounts.length > 0

                  return (
                    <button
                      key={platform.id}
                      onClick={() => hasAccount && togglePlatform(platform.id)}
                      disabled={!hasAccount}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : hasAccount 
                            ? "hover:border-muted-foreground/30" 
                            : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <PlatformIcon 
                        className="h-5 w-5" 
                        style={{ color: platform.color }} 
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{platform.name}</div>
                        {hasAccount ? (
                          <div className="text-xs text-muted-foreground">
                            @{connectedAccounts[0].username}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleConnectPlatform(platform.id)
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Connect account
                          </button>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Video Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter video description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="space-y-2">
                <Label>Privacy</Label>
                <div className="flex gap-2">
                  {["public", "unlisted", "private"].map((option) => (
                    <button
                      key={option}
                      onClick={() => setPrivacy(option)}
                      className={`px-4 py-2 rounded-lg border capitalize transition-all ${
                        privacy === option 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/30"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePublishNow} 
              disabled={isLoading || selectedPlatforms.length === 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Publish Now
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 mt-4">
            {/* Platform Selection (same as now) */}
            <div className="space-y-2">
              <Label>Select Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((platform) => {
                  const PlatformIcon = platform.icon
                  const isSelected = selectedPlatforms.includes(platform.id)
                  const connectedAccounts = getPlatformAccounts(platform.id)
                  const hasAccount = connectedAccounts.length > 0

                  return (
                    <button
                      key={platform.id}
                      onClick={() => hasAccount && togglePlatform(platform.id)}
                      disabled={!hasAccount}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : hasAccount 
                            ? "hover:border-muted-foreground/30" 
                            : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <PlatformIcon 
                        className="h-5 w-5" 
                        style={{ color: platform.color }} 
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{platform.name}</div>
                        {hasAccount && (
                          <div className="text-xs text-muted-foreground">
                            @{connectedAccounts[0].username}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Schedule Date/Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            {/* Video Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-title">Title</Label>
                <Input
                  id="schedule-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-description">Description</Label>
                <Textarea
                  id="schedule-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter video description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-tags">Tags (comma separated)</Label>
                <Input
                  id="schedule-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>

            <Button 
              onClick={handleSchedule} 
              disabled={isLoading || selectedPlatforms.length === 0 || !scheduleDate || !scheduleTime}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Post
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
