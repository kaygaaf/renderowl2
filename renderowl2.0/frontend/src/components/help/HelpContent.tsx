"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Book, Video, MessageCircle, FileText, ChevronDown, ChevronRight } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const faqs = [
  {
    question: "How do I create my first video?",
    answer: "Start by clicking 'Create New Video' on your dashboard. Choose a template or start from scratch. Add scenes, customize content, and export when ready."
  },
  {
    question: "What video formats are supported?",
    answer: "Renderowl supports MP4, MOV, and WebM for uploads. Exports are available in MP4 (H.264) with resolutions from 720p to 4K."
  },
  {
    question: "How do credits work?",
    answer: "Credits are consumed based on video duration and features used. 1 minute of 1080p video typically uses 10 credits. Check your usage in the dashboard."
  },
  {
    question: "Can I use my own branding?",
    answer: "Yes! Pro and Enterprise plans include Brand Kit features. Upload your logo, set brand colors, and fonts for consistent video branding."
  },
  {
    question: "Is there an API available?",
    answer: "Enterprise plans include API access for programmatic video generation. Contact sales for API documentation and access."
  },
]

const guides = [
  { title: "Getting Started Guide", icon: Book, desc: "Learn the basics of Renderowl" },
  { title: "Video Tutorials", icon: Video, desc: "Watch step-by-step tutorials" },
  { title: "API Documentation", icon: FileText, desc: "Integrate with our API" },
  { title: "Community Forum", icon: MessageCircle, desc: "Get help from other users" },
]

export function HelpContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-12">
      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            className="pl-12 h-14 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-4 gap-6">
        {guides.map((guide) => (
          <Link
            key={guide.title}
            href="#"
            className="group p-6 rounded-xl border bg-white hover:shadow-lg transition-all"
          >
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <guide.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-1">{guide.title}</h3>
            <p className="text-sm text-muted-foreground">{guide.desc}</p>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="flex items-center justify-between w-full text-left"
              >
                <span className="font-medium">{faq.question}</span>
                {openFaq === index ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              {openFaq === index && (
                <p className="mt-2 text-muted-foreground">{faq.answer}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact */}
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
        <p className="text-muted-foreground mb-4">Our support team is here to help</p>
        <div className="flex justify-center gap-4">
          <Link
            href="mailto:support@renderowl.app"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Contact Support
          </Link>
          <Link
            href="#"
            className="px-6 py-3 border rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Live Chat
          </Link>
        </div>
      </div>
    </div>
  )
}
