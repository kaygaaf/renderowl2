import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { BatchContent } from "./BatchContent"

export const dynamic = "force-dynamic"

export default async function BatchPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/auth?mode=login")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-64 pt-16">
          <div className="container p-6">
            <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Batch Generator" }]} />
            
            <div className="mt-4 mb-8">
              <h1 className="text-3xl font-bold">AI Content Factory</h1>
              <p className="text-muted-foreground mt-1">
                Generate multiple videos at once with batch automation
              </p>
            </div>
            
            <BatchContent />
          </div>
        </main>
      </div>
    </div>
  )
}
