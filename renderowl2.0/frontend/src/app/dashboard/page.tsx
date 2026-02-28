import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { DashboardContent } from "@/components/dashboard/DashboardContent"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
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
            <Breadcrumbs items={[{ label: "Dashboard" }]} />
            <h1 className="text-3xl font-bold mt-4 mb-8">Dashboard</h1>
            
            <DashboardContent />
          </div>
        </main>
      </div>
    </div>
  )
}
