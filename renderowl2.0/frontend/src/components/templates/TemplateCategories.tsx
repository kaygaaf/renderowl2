"use client"

import { motion } from "framer-motion"
import { 
  Youtube, 
  Smartphone, 
  Camera, 
  Megaphone, 
  GraduationCap, 
  Users, 
  Newspaper, 
  BookOpen, 
  ListOrdered, 
  Lightbulb,
  LayoutGrid
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface Category {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  gradient: string
}

export const templateCategories: Category[] = [
  {
    id: "all",
    label: "All Templates",
    icon: <LayoutGrid className="h-4 w-4" />,
    color: "text-foreground",
    gradient: "from-gray-500 to-gray-600"
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: <Youtube className="h-4 w-4" />,
    color: "text-red-500",
    gradient: "from-red-500 to-pink-600"
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: <Smartphone className="h-4 w-4" />,
    color: "text-pink-500",
    gradient: "from-pink-500 to-purple-500"
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: <Camera className="h-4 w-4" />,
    color: "text-orange-500",
    gradient: "from-orange-500 to-pink-500"
  },
  {
    id: "ads",
    label: "Ads",
    icon: <Megaphone className="h-4 w-4" />,
    color: "text-blue-500",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    id: "education",
    label: "Education",
    icon: <GraduationCap className="h-4 w-4" />,
    color: "text-green-500",
    gradient: "from-green-500 to-teal-500"
  },
  {
    id: "social",
    label: "Social",
    icon: <Users className="h-4 w-4" />,
    color: "text-indigo-500",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    id: "news",
    label: "News",
    icon: <Newspaper className="h-4 w-4" />,
    color: "text-slate-500",
    gradient: "from-slate-700 to-slate-900"
  },
  {
    id: "storytelling",
    label: "Storytelling",
    icon: <BookOpen className="h-4 w-4" />,
    color: "text-amber-600",
    gradient: "from-amber-600 to-orange-700"
  },
  {
    id: "listicle",
    label: "Listicle",
    icon: <ListOrdered className="h-4 w-4" />,
    color: "text-violet-500",
    gradient: "from-violet-500 to-fuchsia-600"
  },
  {
    id: "explainer",
    label: "Explainer",
    icon: <Lightbulb className="h-4 w-4" />,
    color: "text-cyan-500",
    gradient: "from-cyan-500 to-blue-600"
  },
]

interface TemplateCategoriesProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
  counts?: Record<string, number>
  variant?: "tabs" | "pills" | "cards"
}

export function TemplateCategories({ 
  activeCategory, 
  onCategoryChange, 
  counts = {},
  variant = "pills"
}: TemplateCategoriesProps) {
  if (variant === "tabs") {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {templateCategories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeCategory === category.id
                ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg`
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            {category.icon}
            <span>{category.label}</span>
            {counts[category.id] !== undefined && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                activeCategory === category.id
                  ? "bg-white/20"
                  : "bg-background"
              )}>
                {counts[category.id]}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    )
  }

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {templateCategories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl transition-all border-2",
              activeCategory === category.id
                ? `border-transparent bg-gradient-to-br ${category.gradient} text-white shadow-lg scale-105`
                : "border-border bg-card hover:border-primary/50 hover:shadow-md"
            )}
          >
            <div className={cn(
              "p-3 rounded-full",
              activeCategory === category.id
                ? "bg-white/20"
                : "bg-muted"
            )}>
              {category.icon}
            </div>
            <span className="font-medium text-sm">{category.label}</span>
            {counts[category.id] !== undefined && (
              <span className={cn(
                "text-xs",
                activeCategory === category.id
                  ? "text-white/80"
                  : "text-muted-foreground"
              )}>
                {counts[category.id]} templates
              </span>
            )}
          </motion.button>
        ))}
      </div>
    )
  }

  // Default pills variant
  return (
    <div className="flex flex-wrap gap-2">
      {templateCategories.map((category, index) => (
        <motion.button
          key={category.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
            activeCategory === category.id
              ? `bg-primary text-primary-foreground shadow-sm`
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <span className={cn(
            activeCategory === category.id ? "" : category.color
          )}>
            {category.icon}
          </span>
          <span>{category.label}</span>
          {counts[category.id] !== undefined && (
            <span className="text-xs opacity-70">
              ({counts[category.id]})
            </span>
          )}
        </motion.button>
      ))}
    </div>
  )
}
