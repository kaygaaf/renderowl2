import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { SocialDashboard } from "@/components/social/SocialDashboard"

export const dynamic = "force-dynamic"

export default async function SocialPage() {
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
            <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Social" }]} />
            <h1 className="text-3xl font-bold mt-4 mb-8">Social Media</h1>
            
            <SocialDashboard />
          </div>
        </main>
      </div>
    </div>
  )
}
