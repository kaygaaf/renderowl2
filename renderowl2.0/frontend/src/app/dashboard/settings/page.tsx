import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { SettingsContent } from "@/components/dashboard/SettingsContent"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
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
            <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]} />
            <h1 className="text-3xl font-bold mt-4 mb-8">Settings</h1>
            
            <SettingsContent />
          </div>
        </main>
      </div>
    </div>
  )
}
