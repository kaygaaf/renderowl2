"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Search, Sparkles, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/landing/Footer"
import { TemplateCard, Template } from "@/components/templates/TemplateCard"
import { TemplatePreview } from "@/components/templates/TemplatePreview"
import { TemplateCategories, templateCategories } from "@/components/templates/TemplateCategories"
import { toast } from "sonner"

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [isUsingTemplate, setIsUsingTemplate] = useState(false)

  // Fetch templates from API
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/v1/templates')
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      
      const data = await response.json()
      setTemplates(data.data || [])
      setFilteredTemplates(data.data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
      // Fallback to empty array
      setTemplates([])
      setFilteredTemplates([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Filter templates based on category and search
  useEffect(() => {
    let filtered = templates

    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter((t) => t.category === activeCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    setFilteredTemplates(filtered)
  }, [activeCategory, searchQuery, templates])

  // Calculate category counts
  const categoryCounts = templateCategories.reduce((acc, cat) => {
    if (cat.id === "all") {
      acc[cat.id] = templates.length
    } else {
      acc[cat.id] = templates.filter((t) => t.category === cat.id).length
    }
    return acc
  }, {} as Record<string, number>)

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template)
  }

  const handleUseTemplate = async (template: Template) => {
    try {
      setIsUsingTemplate(true)
      
      const response = await fetch(`/api/v1/templates/${template.id}/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${template.name} - ${new Date().toLocaleDateString()}`,
          description: `Created from template: ${template.name}`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create timeline from template')
      }

      const data = await response.json()
      
      toast.success('Timeline created successfully!')
      
      // Navigate to the editor with the new timeline
      router.push(`/editor?timeline=${data.timelineId}`)
    } catch (error) {
      console.error('Error using template:', error)
      toast.error('Failed to create timeline from template')
    } finally {
      setIsUsingTemplate(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container px-4 md:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Video{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Templates
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with a professionally designed template. Customize it to match your brand and create stunning videos in minutes.
            </p>
          </motion.div>

          {/* Search and Filter Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTemplates}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Category Filter */}
            <TemplateCategories
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              counts={categoryCounts}
              variant="tabs"
            />
          </motion.div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading templates...​</span>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={handlePreview}
                  onUse={handleUseTemplate}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setActiveCategory("all")
                  setSearchQuery("")
                }}
              >
                Clear Filters
              </Button>
            </motion.div>
          )}

          {/* Stats Footer */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12 text-center text-sm text-muted-foreground"
            >
              Showing {filteredTemplates.length} of {templates.length} templates
              {activeCategory !== "all" && ` in ${activeCategory}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </motion.div>
          )}
        </div>
      </main>

      <Footer />

      {/* Preview Modal */}
      <TemplatePreview
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUse={handleUseTemplate}
      />

      {/* Loading Overlay */}
      {isUsingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-xl flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Creating timeline from template...​</span>
          </div>
        </div>
      )}
    </div>
  )
}
