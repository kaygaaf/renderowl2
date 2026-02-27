"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Play, Clock, Layers, Search, Filter } from "lucide-react"

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

const templates = [
  {
    id: "1",
    name: "YouTube Intro Pro",
    category: "youtube",
    description: "Professional intro with animated logo and music",
    duration: 8,
    scenes: 4,
    popularity: 98,
    thumbnail: "🎬",
    gradient: "from-red-500 to-pink-600",
  },
  {
    id: "2",
    name: "TikTok Viral Style",
    category: "tiktok",
    description: "Fast-paced edits perfect for viral content",
    duration: 15,
    scenes: 6,
    popularity: 95,
    thumbnail: "📱",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "3",
    name: "Product Showcase",
    category: "ads",
    description: "Highlight your product features beautifully",
    duration: 30,
    scenes: 8,
    popularity: 92,
    thumbnail: "🛍️",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "4",
    name: "Instagram Reel",
    category: "social",
    description: "Vertical format optimized for Instagram",
    duration: 15,
    scenes: 5,
    popularity: 90,
    thumbnail: "📸",
    gradient: "from-orange-500 to-pink-500",
  },
  {
    id: "5",
    name: "Tutorial Video",
    category: "youtube",
    description: "Clean layout for educational content",
    duration: 60,
    scenes: 12,
    popularity: 88,
    thumbnail: "📚",
    gradient: "from-green-500 to-teal-500",
  },
  {
    id: "6",
    name: "App Promo",
    category: "ads",
    description: "Showcase your mobile application",
    duration: 20,
    scenes: 6,
    popularity: 87,
    thumbnail: "📲",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    id: "7",
    name: "TikTok Dance",
    category: "tiktok",
    description: "Perfect for music and dance content",
    duration: 15,
    scenes: 4,
    popularity: 94,
    thumbnail: "💃",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "8",
    name: "Company Overview",
    category: "corporate",
    description: "Professional corporate presentation",
    duration: 45,
    scenes: 10,
    popularity: 85,
    thumbnail: "🏢",
    gradient: "from-slate-500 to-gray-600",
  },
  {
    id: "9",
    name: "Testimonial",
    category: "ads",
    description: "Customer testimonial format",
    duration: 25,
    scenes: 5,
    popularity: 82,
    thumbnail: "💬",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    id: "10",
    name: "Unboxing Video",
    category: "youtube",
    description: "Classic unboxing experience",
    duration: 40,
    scenes: 8,
    popularity: 89,
    thumbnail: "📦",
    gradient: "from-emerald-500 to-green-600",
  },
  {
    id: "11",
    name: "LinkedIn Promo",
    category: "social",
    description: "Professional social media content",
    duration: 20,
    scenes: 4,
    popularity: 80,
    thumbnail: "💼",
    gradient: "from-blue-600 to-blue-800",
  },
  {
    id: "12",
    name: "Event Promo",
    category: "ads",
    description: "Promote your upcoming event",
    duration: 30,
    scenes: 7,
    popularity: 86,
    thumbnail: "🎉",
    gradient: "from-violet-500 to-purple-600",
  },
]

export function TemplatesGallery() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = activeCategory === "all" || template.category === activeCategory
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

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
              <span className="text-6xl">{template.thumbnail}</span>
              
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
                  {template.scenes} scenes
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
