"use client"

import Link from "next/link"
import { ArrowRight, Play, Sparkles, Zap, Video } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-3xl" />
      </div>

      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/50 backdrop-blur px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>Introducing AI-Powered Video Creation</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl"
          >
            Create Stunning Videos{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              with AI
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl"
          >
            Generate professional videos in minutes. AI scenes, templates, and a powerful timeline editor 
            — all in one platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8"
            >
              <Link href="/auth?mode=signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <Link href="#features" className="flex items-center">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-8 pt-8"
          >
            {[
              { value: "10K+", label: "Videos Created" },
              { value: "50+", label: "AI Templates" },
              { value: "99%", label: "Satisfaction" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="relative mt-16 w-full max-w-5xl"
          >
            <div className="relative rounded-2xl border bg-white shadow-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1 text-xs text-muted-foreground">
                    <Video className="h-3 w-3" />
                    app.renderowl.app/editor/project-123
                  </div>
                </div>
              </div>

              {/* Editor preview */}
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 relative">
                <div className="absolute inset-0 flex">
                  {/* Sidebar */}
                  <div className="w-16 border-r border-white/10 bg-slate-950/50" />
                  
                  {/* Main content */}
                  <div className="flex-1 p-8">
                    <div className="h-full rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                          <Zap className="h-10 w-10 text-white" />
                        </div>
                        <p className="text-white/80 text-lg">AI Video Editor Preview</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right panel */}
                  <div className="w-64 border-l border-white/10 bg-slate-950/50 p-4">
                    <div className="space-y-4">
                      <div className="h-4 w-3/4 bg-white/10 rounded" />
                      <div className="h-24 bg-white/5 rounded-lg" />
                      <div className="h-4 w-1/2 bg-white/10 rounded" />
                      <div className="h-12 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
                
                {/* Timeline */}
                <div className="absolute bottom-0 left-0 right-0 h-32 border-t border-white/10 bg-slate-950/80 backdrop-blur">
                  <div className="flex items-center gap-2 p-4">
                    <div className="h-8 w-8 rounded bg-white/10" />
                    <div className="h-8 w-8 rounded bg-white/10" />
                    <div className="h-8 w-8 rounded bg-white/10" />
                    <div className="flex-1 h-16 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
