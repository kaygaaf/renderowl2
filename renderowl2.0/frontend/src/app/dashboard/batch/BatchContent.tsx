"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BatchCreationForm } from "./BatchCreationForm"
import { BatchProgress } from "./BatchProgress"
import { BatchResults } from "./BatchResults"
import { IdeationPanel } from "./IdeationPanel"
import { QueueStatus } from "./QueueStatus"
import { Sparkles, ListTodo, BarChart3, Lightbulb, Activity } from "lucide-react"

interface Batch {
  id: string
  name: string
  status: string
  totalVideos: number
  completed: number
  failed: number
  inProgress: number
  progress: number
  createdAt: string
  updatedAt: string
}

export function BatchContent() {
  const [activeTab, setActiveTab] = useState("create")
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/v1/batch")
      if (response.ok) {
        const data = await response.json()
        // Map API data to ensure all required fields are present
        const mappedBatches: Batch[] = (data.data || []).map((b: any) => ({
          ...b,
          inProgress: b.inProgress ?? 0,
          updatedAt: b.updatedAt || b.createdAt || new Date().toISOString(),
        }))
        setBatches(mappedBatches)
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error)
    }
  }

  useEffect(() => {
    fetchBatches()
    const interval = setInterval(fetchBatches, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const handleBatchCreated = (batch: Batch) => {
    setBatches((prev) => [batch, ...prev])
    setSelectedBatch(batch)
    setActiveTab("progress")
  }

  const handleViewResults = (batch: Batch) => {
    setSelectedBatch(batch)
    setActiveTab("results")
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 lg:w-[800px]">
        <TabsTrigger value="create" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Create Batch</span>
        </TabsTrigger>
        <TabsTrigger value="ideation" className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          <span className="hidden sm:inline">Ideation</span>
        </TabsTrigger>
        <TabsTrigger value="progress" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Progress</span>
        </TabsTrigger>
        <TabsTrigger value="results" className="flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          <span className="hidden sm:inline">Results</span>
        </TabsTrigger>
        <TabsTrigger value="queue" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Queue</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="create" className="space-y-4">
        <BatchCreationForm onBatchCreated={handleBatchCreated} />
      </TabsContent>

      <TabsContent value="ideation" className="space-y-4">
        <IdeationPanel onUseSuggestion={(title, description) => {
          setActiveTab("create")
        }} />
      </TabsContent>

      <TabsContent value="progress" className="space-y-4">
        <BatchProgress 
          batches={batches} 
          selectedBatch={selectedBatch}
          onSelectBatch={setSelectedBatch}
          onViewResults={handleViewResults}
        />
      </TabsContent>

      <TabsContent value="results" className="space-y-4">
        <BatchResults 
          batch={selectedBatch}
          onBack={() => setActiveTab("progress")}
        />
      </TabsContent>

      <TabsContent value="queue" className="space-y-4">
        <QueueStatus />
      </TabsContent>
    </Tabs>
  )
}
