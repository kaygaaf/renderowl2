import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/Navbar"

export default async function EditorPage({
  searchParams,
}: {
  searchParams: { template?: string; id?: string }
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/auth?mode=login")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: "User", email: "user@example.com" }} />
      
      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)] flex">
          {/* Left Sidebar - Assets */}
          <div className="w-64 border-r bg-muted/50 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Assets</h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-20 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                🖼️
              </div>
              <div className="h-20 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                🎵
              </div>
              <div className="h-20 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                🎬
              </div>
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold">Untitled Project</h2>
                <span className="text-sm text-muted-foreground">Auto-saved</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm border rounded hover:bg-muted">Preview</button>
                <button className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded">
                  Export
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-8">
              <div className="aspect-video w-full max-w-4xl bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎬</div>
                  <p className="text-white/60">Editor Canvas</p>
                  <p className="text-white/40 text-sm mt-2">Template: {searchParams.template || "None"}</p>
                  {searchParams.id && <p className="text-white/40 text-sm">Editing: {searchParams.id}</p>}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="h-48 border-t bg-muted/50">
              <div className="h-10 border-b flex items-center px-4 gap-2">
                <button className="p-1.5 hover:bg-muted rounded">⏮️</button>
                <button className="p-1.5 hover:bg-muted rounded">▶️</button>
                <button className="p-1.5 hover:bg-muted rounded">⏭️</button>
                <div className="h-4 w-px bg-border mx-2" />
                <span className="text-sm text-muted-foreground">00:00 / 00:30</span>
              </div>
              
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16 text-muted-foreground">Video</span>
                  <div className="flex-1 h-8 bg-blue-600/20 rounded border border-blue-600/40" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16 text-muted-foreground">Audio</span>
                  <div className="flex-1 h-8 bg-purple-600/20 rounded border border-purple-600/40" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16 text-muted-foreground">Text</span>
                  <div className="flex-1 h-8 bg-green-600/20 rounded border border-green-600/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-72 border-l bg-muted/50">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Properties</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scene Duration</label>
                <input type="range" className="w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Transition</label>
                <select className="w-full p-2 rounded border text-sm">
                  <option>Fade</option>
                  <option>Slide</option>
                  <option>Zoom</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Background</label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 rounded bg-blue-500 cursor-pointer" />
                  <div className="h-8 rounded bg-purple-500 cursor-pointer" />
                  <div className="h-8 rounded bg-pink-500 cursor-pointer" />
                  <div className="h-8 rounded bg-gradient-to-r from-blue-500 to-purple-500 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
