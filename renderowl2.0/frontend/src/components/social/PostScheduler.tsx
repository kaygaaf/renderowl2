"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar,
  Clock,
  Send,
  Repeat,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  ChevronDown,
  ChevronUp,
  Globe,
  Lock,
  Users
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { format, addDays, addWeeks, addMonths } from "date-fns"

interface SocialAccount {
  id: string
  platform: string
  accountName: string
  status: string
}

interface PlatformConfig {
  accountId: string
  platform: string
  enabled: boolean
  customTitle: string
  customDescription: string
  tags: string[]
  privacy: string
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
}

export function PostScheduler() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [videoId, setVideoId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, PlatformConfig>>({})
  const [recurring, setRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState("weekly")
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAccounts()
    // Set default scheduled time to tomorrow at 9 AM
    const tomorrow = addDays(new Date(), 1)
    setScheduledDate(format(tomorrow, "yyyy-MM-dd"))
    setScheduledTime("09:00")
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await api.get("/social/accounts")
      const accounts = response.data.accounts || []
      setAccounts(accounts)
      
      // Initialize platform configs
      const configs: Record<string, PlatformConfig> = {}
      accounts.forEach((account: SocialAccount) => {
        configs[account.id] = {
          accountId: account.id,
          platform: account.platform,
          enabled: false,
          customTitle: "",
          customDescription: "",
          tags: [],
          privacy: "public",
        }
      })
      setPlatformConfigs(configs)
    } catch (error) {
      console.error("Failed to load accounts:", error)
    }
  }

  const handlePlatformToggle = (accountId: string, enabled: boolean) => {
    setPlatformConfigs((prev) => ({
      ...prev,
      [accountId]: { ...prev[accountId], enabled },
    }))
  }

  const handlePlatformConfigChange = (accountId: string, field: string, value: any) => {
    setPlatformConfigs((prev) => ({
      ...prev,
      [accountId]: { ...prev[accountId], [field]: value },
    }))
  }

  const togglePlatformExpanded = (accountId: string) => {
    setExpandedPlatforms((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    )
  }

  const handleSchedule = async () => {
    setLoading(true)
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
      
      const platforms = Object.values(platformConfigs)
        .filter((config) => config.enabled)
        .map((config) => ({
          accountId: config.accountId,
          platform: config.platform,
          title: config.customTitle || title,
          description: config.customDescription || description,
          tags: config.tags,
          privacy: config.privacy,
        }))

      if (platforms.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one platform",
          variant: "destructive",
        })
        return
      }

      const requestBody: any = {
        videoId,
        title,
        description,
        platforms,
        scheduledAt: scheduledAt.toISOString(),
        timezone,
      }

      if (recurring) {
        requestBody.recurring = {
          frequency: recurringFrequency,
          interval: 1,
        }
      }

      await api.post("/social/schedule", requestBody)

      toast({
        title: "Success",
        description: "Post scheduled successfully",
      })

      // Reset form
      setTitle("")
      setDescription("")
      setVideoId("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule post",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePublishNow = async () => {
    setLoading(true)
    try {
      const platforms = Object.values(platformConfigs)
        .filter((config) => config.enabled)
        .map((config) => config.accountId)

      await api.post("/social/crosspost", {
        accountIds: platforms,
        videoPath: videoId, // Would be actual video path
        title,
        description,
        tags: [],
        privacy: "public",
      })

      toast({
        title: "Success",
        description: "Published to all selected platforms",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const enabledPlatformsCount = Object.values(platformConfigs).filter((c) => c.enabled).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Post</CardTitle>
          <CardDescription>Schedule your video to be published across multiple platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="video">Select Video</Label>
            <Select value={videoId} onValueChange={setVideoId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a video..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video1">Video 1</SelectItem>
                <SelectItem value="video2">Video 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter post description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Select Platforms ({enabledPlatformsCount} selected)</Label>
            
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No connected accounts. Connect accounts in the Accounts tab.
              </p>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => {
                  const Icon = platformIcons[account.platform as keyof typeof platformIcons]
                  const config = platformConfigs[account.id]
                  const isExpanded = expandedPlatforms.includes(account.id)
                  
                  if (!config) return null
                  
                  return (
                    <div key={account.id} className="border rounded-lg">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={config.enabled}
                            onCheckedChange={(checked) =>
                              handlePlatformToggle(account.id, checked as boolean)
                            }
                          />
                          {Icon && <Icon className="h-5 w-5" />}
                          <span className="capitalize font-medium">{account.platform}</span>
                          <span className="text-sm text-muted-foreground">({account.accountName})</span>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePlatformExpanded(account.id)}
                          disabled={!config.enabled}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {isExpanded && config.enabled && (
                        <div className="p-3 pt-0 border-t space-y-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Custom Title (optional)</Label>
                            <Input
                              placeholder={`Default: ${title}`}
                              value={config.customTitle}
                              onChange={(e) =>
                                handlePlatformConfigChange(account.id, "customTitle", e.target.value)
                              }
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm">Custom Description (optional)</Label>
                            <Textarea
                              placeholder={`Default: ${description}`}
                              value={config.customDescription}
                              onChange={(e) =>
                                handlePlatformConfigChange(account.id, "customDescription", e.target.value)
                              }
                              className="text-sm"
                              rows={2}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm">Privacy</Label>
                            <Select
                              value={config.privacy}
                              onValueChange={(value) =>
                                handlePlatformConfigChange(account.id, "privacy", value)
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Public
                                  </div>
                                </SelectItem>
                                <SelectItem value="unlisted">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Unlisted
                                  </div>
                                </SelectItem>
                                <SelectItem value="private">
                                  <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    Private
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={recurring}
                onCheckedChange={(checked) => setRecurring(checked as boolean)}
              />
              <Label className="text-sm">Recurring post</Label>
            </div>
            
            {recurring && (
              <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handlePublishNow}
              disabled={loading || enabledPlatformsCount === 0}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Publish Now
            </Button>
            
            <Button
              onClick={handleSchedule}
              disabled={loading || enabledPlatformsCount === 0}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
