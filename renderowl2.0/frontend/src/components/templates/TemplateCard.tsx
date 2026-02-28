"use client"

import { motion } from "framer-motion"
import { Play, Clock, Layers, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"

export interface Template {
  id: string
  name: string
  description: string
  category: string
  thumbnail: string
  icon: string
  gradient: string
  duration: number
  width: number
  height: number
  fps: number
  scenes?: TemplateScene[]
  popularity: number
  version: number
  isActive: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface TemplateScene {
  id: string
  name: string
  description: string
  duration: number
  order: number
  clips: TemplateClip[]
  transitions?: TemplateTransition
}

export interface TemplateClip {
  id: string
  name: string
  type: string
  sourceType: string
  sourceUrl?: string
  placeholder?: string
  startTime: number
  endTime: number
  positionX: number
  positionY: number
  scale: number
  rotation: number
  opacity: number
  textContent?: string
  textStyle?: TemplateTextStyle
}

export interface TemplateTextStyle {
  fontSize: number
  fontFamily: string
  color: string
  background?: string
  backgroundColor?: string
  bold: boolean
  italic: boolean
  alignment: string
}

export interface TemplateTransition {
  type: string
  duration: number
  easing?: string
}

interface TemplateCardProps {
  template: Template
  onPreview: (template: Template) => void
  onUse: (template: Template) => void
  index?: number
}

export function TemplateCard({ template, onPreview, onUse, index = 0 }: TemplateCardProps) {
  const aspectRatio = template.width / template.height
  const isVertical = aspectRatio < 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300 hover:shadow-xl">
        {/* Thumbnail */}
        <div 
          className={`relative bg-gradient-to-br ${template.gradient} flex items-center justify-center overflow-hidden`}
          style={{ aspectRatio: isVertical ? "9/16" : "16/9" }}
        >
          <span className="text-6xl md:text-7xl transform group-hover:scale-110 transition-transform duration-500">
            {template.icon}
          </span>
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
            <Button 
              onClick={() => onPreview(template)}
              className="bg-white text-black hover:bg-white/90 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
            >
              <Play className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.duration}s
          </div>

          {/* Resolution Badge */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {template.width}x{template.height}
          </div>

          {/* Popular Badge */}
          {template.popularity >= 90 && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Popular
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg leading-tight">{template.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {template.description}
              </p>
            </div>
            <span className="text-xs bg-muted px-2 py-1 rounded-full capitalize whitespace-nowrap shrink-0">
              {template.category}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {template.scenes?.length || 0} scenes
            </span>
            <span>{template.fps} FPS</span>
            <span>🔥 {template.popularity}%</span>
          </div>
          
          {/* Tags */}
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {template.tags.slice(0, 3).map((tag) => (
                <span 
                  key={tag}
                  className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0">
          <Button 
            onClick={() => onUse(template)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Use Template
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
