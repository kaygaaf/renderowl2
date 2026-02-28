import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/landing/Footer"
import { Features } from "@/components/landing/Features"
import { motion } from "framer-motion"

export const dynamic = "force-dynamic"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Header */}
        <section className="py-24">
          <div className="container px-4 md:px-6 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold mb-6"
            >
              Powerful Features for{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modern Creators
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Everything you need to create professional videos at scale. From AI generation to brand management.
            </motion.p>
          </div>
        </section>

        <Features />

        {/* Additional Feature Details */}
        <section className="py-24 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">AI-Powered Scene Generation</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Describe your vision and watch as AI creates stunning scenes. Our advanced models understand context, style, and brand requirements to generate professional-quality visuals in seconds.
                </p>
                <ul className="space-y-3">
                  {[
                    "Natural language scene descriptions",
                    "Style-matching to your brand",
                    "Automatic asset generation",
                    "Smart composition and framing"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                <div className="text-8xl">🤖</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 aspect-square rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                <div className="text-8xl">🎨</div>
              </div>
              
              <div className="order-1">
                <h2 className="text-3xl font-bold mb-4">Professional Timeline Editor</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Edit with precision using our professional timeline. Drag, drop, trim, and arrange clips with an interface designed for both beginners and pros.
                </p>
                <ul className="space-y-3">
                  {[
                    "Multi-track timeline editing",
                    "Frame-accurate trimming",
                    "Keyframe animations",
                    "Real-time preview"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}
