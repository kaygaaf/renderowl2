"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Play, Pause, Clock, Layers, Monitor, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Template } from "./TemplateCard"

interface TemplatePreviewProps {
  template: Template | null
  isOpen: boolean
  onClose: () => void
  onUse: (template: Template) => void
}

export function TemplatePreview({ template, isOpen, onClose, onUse }: TemplatePreviewProps) {
  const [activeScene, setActiveScene] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  if (!template) return null

  const scenes = template.scenes || []
  const aspectRatio = template.width / template.height
  const isVertical = aspectRatio < 1

  const handleUseTemplate = () => {
    onUse(template)
    onClose()
  }

  const nextScene = () => {
    setActiveScene((prev) => (prev + 1) % scenes.length)
  }

  const prevScene = () => {
    setActiveScene((prev) => (prev - 1 + scenes.length) % scenes.length)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-5xl p-0 overflow-hidden ${isVertical ? 'max-h-[90vh]' : ''}`}>
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {template.name}
                {template.popularity >= 90 && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">{template.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="p-6 pt-4">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="scenes">Scenes ({scenes.length})</TabsTrigger>
          </TabsList>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-4">
            <div className="flex flex-col items-center gap-4">
              {/* Preview Window */}
              <div 
                className={`relative bg-gradient-to-br ${template.gradient} rounded-lg overflow-hidden shadow-2xl`}
                style={{ 
                  aspectRatio: isVertical ? "9/16" : "16/9",
                  maxHeight: isVertical ? "50vh" : "40vh",
                  width: isVertical ? "auto" : "100%"
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScene}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-8"
                  >
                    <span className="text-8xl mb-4">{template.icon}</span>
                    {scenes[activeScene] && (
                      <div className="text-center">
                        <h4 className="text-white text-xl font-bold">
                          {scenes[activeScene].name}
                        </h4>
                        <p className="text-white/80 text-sm mt-1">
                          {scenes[activeScene].description}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Scene Navigation */}
                {scenes.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={prevScene}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={nextScene}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                {/* Scene Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {scenes.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveScene(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === activeScene ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Use Template Button */}
              <Button 
                onClick={handleUseTemplate}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Use This Template
              </Button>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Duration</span>
                </div>
                <p className="text-2xl font-bold">{template.duration}s</p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm">Resolution</span>
                </div>
                <p className="text-2xl font-bold">{template.width}×{template.height}</p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm">Scenes</span>
                </div>
                <p className="text-2xl font-bold">{scenes.length}</p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">Popularity</span>
                </div>
                <p className="text-2xl font-bold">{template.popularity}%</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-6 text-sm text-muted-foreground">
              <p>Version: {template.version}</p>
              <p>Last Updated: {new Date(template.updatedAt).toLocaleDateString()}</p>
            </div>
          </TabsContent>

          {/* Scenes Tab */}
          <TabsContent value="scenes" className="mt-4">
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {scenes.map((scene, idx) => (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    activeScene === idx 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setActiveScene(idx)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{scene.name}</h4>
                      <p className="text-sm text-muted-foreground">{scene.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">{scene.duration}s</span>
                      <p className="text-xs text-muted-foreground">{scene.clips.length} clips</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
