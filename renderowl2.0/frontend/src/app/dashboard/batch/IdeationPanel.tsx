"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  Lightbulb, 
  Users, 
  Calendar, 
  Plus, 
  ExternalLink,
  Sparkles,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface TrendingTopic {
  id: string
  title: string
  platform: string
  category: string
  score: number
  volume: number
}

interface ContentSuggestion {
  id: string
  title: string
  description: string
  estimatedViews: number
  difficulty: string
  hook: string
  tags: string[]
}

interface IdeationPanelProps {
  onUseSuggestion: (title: string, description: string) => void
}

export function IdeationPanel({ onUseSuggestion }: IdeationPanelProps) {
  const [activeTab, setActiveTab] = useState("trending")
  const [niche, setNiche] = useState("tech")
  const [isLoading, setIsLoading] = useState(false)
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([])

  const fetchTrendingTopics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/v1/ideation/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: ["youtube", "tiktok", "twitter"],
          limit: 20,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTrendingTopics(data.data || [])
      }
    } catch (error) {
      toast.error("Failed to fetch trending topics")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/v1/ideation/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          format: "short",
          count: 10,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.data || [])
      }
    } catch (error) {
      toast.error("Failed to fetch suggestions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseSuggestion = (suggestion: ContentSuggestion) => {
    onUseSuggestion(suggestion.title, suggestion.description)
    toast.success("Added to batch!")
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="trending" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Trending
        </TabsTrigger>
        <TabsTrigger value="suggestions" className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          AI Suggestions
        </TabsTrigger>
        <TabsTrigger value="competitors" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Competitors
        </TabsTrigger>
        <TabsTrigger value="calendar" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendar
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trending" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Topics
            </CardTitle>
            <CardDescription>
              Discover what's trending across platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button onClick={fetchTrendingTopics} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Refresh Trends"
                )}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {trendingTopics.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Click Refresh to see trending topics</p>
                  </div>
                ) : (
                  trendingTopics.map((topic) => (
                    <div key={topic.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{topic.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{topic.platform}</Badge>
                            <Badge variant="outline">{topic.category}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{topic.score.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>{(topic.volume / 1000000).toFixed(1)}M views</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="suggestions" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI Content Suggestions
            </CardTitle>
            <CardDescription>
              Get AI-powered video ideas for your niche
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter niche (e.g., tech, fitness, cooking)"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={fetchSuggestions} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Get Suggestions"
                )}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {suggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Enter a niche and click Get Suggestions</p>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <Card key={suggestion.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">{suggestion.title}</h4>
                            <p className="text-muted-foreground mt-1">
                              {suggestion.description}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary">
                                ~{suggestion.estimatedViews.toLocaleString()} views
                              </Badge>
                              <Badge variant="outline">{suggestion.difficulty}</Badge>
                            </div>

                            <div className="mt-3 p-3 bg-muted rounded">
                              <p className="text-sm font-medium">Hook:</p>
                              <p className="text-sm text-muted-foreground italic">
                                "{suggestion.hook}"
                              </p>
                            </div>

                            <div className="flex gap-1 mt-2">
                              {suggestion.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            className="ml-4"
                            onClick={() => handleUseSuggestion(suggestion)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Use
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="competitors" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Competitor Analysis</CardTitle>
            <CardDescription>
              Analyze competitor channels for content gaps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Enter channel URL..." className="flex-1" />
              <Button>Analyze</Button>
            </div>

            <div className="mt-6 text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>Enter a competitor channel URL to analyze their content</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calendar" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>30-Day Content Calendar</CardTitle>
            <CardDescription>
              Generate a complete content calendar for your niche
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input placeholder="Enter niche..." defaultValue={niche} />
              <Input 
                type="number" 
                placeholder="Videos/week" 
                defaultValue={3}
                className="w-32"
              />
              <Button>Generate Calendar</Button>
            </div>

            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p>Generate a 30-day content calendar with video ideas</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
