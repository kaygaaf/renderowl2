"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, Grid3X3, List, MoreVertical, Play, Edit, Trash2, Copy, Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProjects } from "@/contexts/AuthContext"
import { timelineApi } from "@/lib/api"

const filters = [
  { id: "all", label: "All Videos" },
  { id: "completed", label: "Completed" },
  { id: "processing", label: "Processing" },
  { id: "draft", label: "Drafts" },
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

export function VideosList() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { projects, projectsLoading, projectsError, refreshProjects } = useProjects()

  const filteredVideos = projects.filter((video) => {
    const matchesFilter = activeFilter === "all" || video.status === activeFilter
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleDelete = async (id: string) => {
    try {
      await timelineApi.delete(id)
      await refreshProjects()
    } catch (error) {
      console.error("Failed to delete project:", error)
    }
  }

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (projectsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-600">{projectsError}</p>
        <Button onClick={refreshProjects}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <Tabs value={activeFilter} onValueChange={setActiveFilter}>
            <TabsList>
              {filters.map((filter) => (
                <TabsTrigger key={filter.id} value={filter.id}>
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600" asChild>
            <Link href="/editor">
              <Plus className="mr-2 h-4 w-4" />
              New Video
            </Link>
          </Button>
        </div>
      </div>

      {/* Videos */}
      {viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="group rounded-xl border bg-white overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="relative aspect-video bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                <div className="text-4xl">🎬</div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/editor?id=${video.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold truncate">{video.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StatusBadge status={video.status} />
                  <span>•</span>
                  <span>{video.duration}s</span>
                </div>
                
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(video.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium">Video</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Duration</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideos.map((video) => (
                <tr key={video.id} className="border-t hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                        🎬
                      </div>
                      <span className="font-medium">{video.title}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={video.status} />
                  </td>
                  <td className="p-4">{video.duration}s</td>
                  <td className="p-4">{new Date(video.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/editor?id=${video.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(video.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredVideos.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🎬</div>
          <h3 className="text-lg font-semibold mb-2">No videos found</h3>
          <Button className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600" asChild>
            <Link href="/editor">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Video
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
