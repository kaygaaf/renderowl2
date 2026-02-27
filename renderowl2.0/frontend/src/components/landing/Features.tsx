"use client"

import { motion } from "framer-motion"
import { Wand2, Layout, Layers, Palette, Share2, Sparkles } from "lucide-react"

const features = [
  {
    icon: Wand2,
    title: "AI Scene Generation",
    description: "Describe your vision and let AI create stunning scenes. Our advanced models understand context and generate professional-quality visuals.",
  },
  {
    icon: Layout,
    title: "Timeline Editor",
    description: "Professional-grade timeline with drag-and-drop simplicity. Trim, split, and arrange clips with precision.",
  },
  {
    icon: Layers,
    title: "50+ Templates",
    description: "Ready-made templates for YouTube, TikTok, Instagram, and ads. Customize colors, fonts, and branding in seconds.",
  },
  {
    icon: Palette,
    title: "Brand Kit",
    description: "Save your brand colors, fonts, and logos. Apply consistent branding across all your videos automatically.",
  },
  {
    icon: Share2,
    title: "One-Click Export",
    description: "Export in multiple formats and resolutions. Direct publishing to YouTube, TikTok, and social platforms.",
  },
  {
    icon: Sparkles,
    title: "Smart Effects",
    description: "AI-powered transitions, color grading, and audio enhancement. Make your videos stand out effortlessly.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Everything You Need to Create{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Amazing Videos
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Powerful features designed for creators, marketers, and businesses
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
