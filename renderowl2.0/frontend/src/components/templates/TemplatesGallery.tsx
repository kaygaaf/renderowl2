"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Play, Clock, Layers, Search, Filter, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const categories = [
  { id: "all", label: "All Templates" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "ads", label: "Ads" },
  { id: "social", label: "Social" },
  { id: "corporate", label: "Corporate" },
]

interface Template {
  id: string
  name: string
  category: string
  description: string
  duration: number
  scenes?: number
  popularity: number
  thumbnail: string
  gradient: string
  icon?: string
}

export function TemplatesGallery() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/v1/templates')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        
        // Transform API response to match component structure
        const transformedTemplates = data.data?.map((t: Template & { scenes?: unknown[] }) => ({
          ...t,
          icon: t.icon || t.thumbnail,
          scenes: Array.isArray(t.scenes) ? t.scenes.length : (t.scenes || 0),
        })) || []
        
        setTemplates(transformedTemplates)
      } catch (error) {
        console.error('Error fetching templates:', error)
        // Fallback to empty array
        setTemplates([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = activeCategory === "all" || template.category === activeCategory
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading templates...​</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group rounded-xl border bg-white overflow-hidden hover:shadow-lg transition-all"
          >
            {/* Thumbnail */}
            <div className={`relative aspect-video bg-gradient-to-br ${template.gradient} flex items-center justify-center`}>
              <span className="text-6xl">{template.icon || template.thumbnail}</span>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button className="bg-white text-black hover:bg-white/90">
                  <Play className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
              
              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {template.duration}s
              </div>
            </div>
            
            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{template.name}</h3>
                <span className="text-xs bg-muted px-2 py-1 rounded-full capitalize">
                  {template.category}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {template.scenes || 0} scenes
                </span>
                <span>🔥 {template.popularity}% popular</span>
              </div>
              
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600" asChild>
                <Link href={`/editor?template=${template.id}`}>Use Template</Link>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  )
}
