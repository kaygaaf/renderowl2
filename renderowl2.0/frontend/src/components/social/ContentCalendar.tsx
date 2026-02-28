"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Video,
  Youtube,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  MoreHorizontal,
  X
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from "date-fns"

interface ScheduledPost {
  id: string
  title: string
  description: string
  scheduledAt: string
  status: "draft" | "scheduled" | "publishing" | "published" | "failed" | "cancelled"
  platforms: {
    platform: string
    status: string
  }[]
}

const platformIcons = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
}

export function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await api.get("/social/schedule")
      setPosts(response.data.posts || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scheduled posts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (postId: string) => {
    try {
      await api.delete(`/social/schedule/${postId}`)
      toast({
        title: "Success",
        description: "Post cancelled",
      })
      fetchPosts()
      setSelectedPost(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel post",
        variant: "destructive",
      })
    }
  }

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) => isSameDay(new Date(post.scheduledAt), day))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500"
      case "scheduled":
        return "bg-blue-500"
      case "publishing":
        return "bg-yellow-500"
      case "failed":
        return "bg-red-500"
      case "cancelled":
        return "bg-gray-400"
      default:
        return "bg-gray-300"
    }
  }

  // Calendar generation
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Content Calendar</CardTitle>
            <CardDescription>View and manage your scheduled content</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-sm font-medium py-2 text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, idx) => {
                const dayPosts = getPostsForDay(date)
                const isCurrentMonth = isSameMonth(date, currentDate)
                const isToday = isSameDay(date, new Date())
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[100px] p-2 border rounded-lg",
                      !isCurrentMonth && "bg-muted/50 text-muted-foreground",
                      isToday && "border-primary"
                    )}
                  >
                    <span className={cn(
                      "text-sm",
                      isToday && "font-bold text-primary"
                    )}>
                      {format(date, "d")}
                    </span>
                    
                    <div className="mt-1 space-y-1">
                      {dayPosts.map((post) => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-1 px-1 py-0.5 rounded text-xs bg-primary/10 hover:bg-primary/20">
                            <div className={cn("w-2 h-2 rounded-full", getStatusColor(post.status))} />
                            <span className="truncate">{post.title}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedPost && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedPost.title}</CardTitle>
                        <CardDescription>
                          Scheduled for {format(new Date(selectedPost.scheduledAt), "PPP 'at' p")}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedPost(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{selectedPost.description}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Platforms</Label>
                      <div className="flex gap-2 mt-1">
                        {selectedPost.platforms.map((p) => {
                          const Icon = platformIcons[p.platform as keyof typeof platformIcons]
                          return (
                            <div key={p.platform} className="flex items-center gap-1">
                              {Icon && <Icon className="h-4 w-4" />}
                              <Badge variant="outline" className="capitalize">{p.platform}</Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {selectedPost.status === "scheduled" && (
                        <>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleCancel(selectedPost.id)}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={async () => {
                              await api.post(`/social/publish/${selectedPost.id}`)
                              toast({ title: "Publishing now" })
                              fetchPosts()
                              setSelectedPost(null)
                            }}
                          >
                            Publish Now
                          </Button>
                        </>
                      )}
                      
                      {selectedPost.status === "failed" && (
                        <Button
                          className="w-full"
                          onClick={async () => {
                            await api.post(`/social/retry/${selectedPost.id}`)
                            toast({ title: "Retrying post" })
                            fetchPosts()
                            setSelectedPost(null)
                          }}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
