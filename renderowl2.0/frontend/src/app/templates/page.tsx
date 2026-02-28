import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/landing/Footer"
import { TemplatesGallery } from "@/components/templates/TemplatesGallery"

export const dynamic = "force-dynamic"

export default function TemplatesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-16">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Video{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Templates
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with a professionally designed template. Customize it to match your brand.
            </p>
          </div>
          
          <TemplatesGallery />
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
