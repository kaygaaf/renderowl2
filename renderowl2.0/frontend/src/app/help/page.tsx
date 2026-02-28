import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/landing/Footer"
import { HelpContent } from "@/components/help/HelpContent"

export const dynamic = "force-dynamic"

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-16">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Help Center</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find answers to your questions and learn how to use Renderowl
            </p>
          </div>
          
          <HelpContent />
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
