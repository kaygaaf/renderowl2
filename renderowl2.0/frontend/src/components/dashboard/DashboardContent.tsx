"use client"

import Link from "next/link"
import { Plus, Film, Clock, TrendingUp, Sparkles, MoreVertical, Play, Edit, Trash2 } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

// Mock data - replace with actual API calls
const stats = [
  { label: "Total Videos", value: 24, icon: Film, change: "+3 this week" },
  { label: "Minutes Generated", value: 186, icon: Clock, change: "+45 min" },
  { label: "Credits Used", value: "850/1000", icon: TrendingUp, change: "85% of plan" },
]

const recentProjects = [
  { id: "1", title: "Product Launch Promo", status: "completed", thumbnail: "", duration: 45, updatedAt: "2 hours ago" },
  { id: "2", title: "YouTube Intro 2024", status: "processing", thumbnail: "", duration: 12, updatedAt: "5 hours ago" },
  { id: "3", title: "TikTok Tutorial", status: "draft", thumbnail: "", duration: 30, updatedAt: "1 day ago" },
  { id: "4", title: "Instagram Reel", status: "completed", thumbnail: "", duration: 15, updatedAt: "2 days ago" },
]

const templates = [
  { id: "1", name: "YouTube Intro", category: "youtube", icon: "🎬" },
  { id: "2", name: "TikTok Viral", category: "tiktok", icon: "📱" },
  { id: "3", name: "Product Ad", category: "ads", icon: "🛍️" },
]

function StatusBadge({ status }: { status: string }) {
  const styles = {
    completed: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-700",
    failed: "bg-red-100 text-red-700",
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function DashboardContent() {
  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
          <Plus className="mr-2 h-5 w-5" />
          Create New Video
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/templates">
            <Sparkles className="mr-2 h-5 w-5" />
            Browse Templates
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Usage Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Credits Used</span>
            <span className="font-medium">850 / 1,000</span>
          </div>
          <Progress value={85} className="h-2" />
          <p className="text-sm text-muted-foreground">
            You&apos;re using 85% of your monthly credits. {" "}
            <Link href="/dashboard/billing" className="text-blue-600 hover:underline">
              Upgrade your plan
            </Link>
            {" "}for more.
          </p>
        </CardContent>
      </Card>

      {/* Recent Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Projects</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/videos">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="h-16 w-24 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <Film className="h-6 w-6 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{project.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <StatusBadge status={project.status} />
                    <span>•</span>
                    <span>{project.duration}s</span>
                    <span>•</span>
                    <span>{project.updatedAt}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>Rename</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/editor?template=${template.id}`}
                className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-600 hover:bg-blue-50/50 transition-all"
              >
                <span className="text-3xl">{template.icon}</span>
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-muted-foreground capitalize">{template.category}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
