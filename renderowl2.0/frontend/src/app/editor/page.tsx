"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import EditorContent from "./EditorContent"

export const dynamic = "force-dynamic"

function EditorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorContent />
    </Suspense>
  )
}
