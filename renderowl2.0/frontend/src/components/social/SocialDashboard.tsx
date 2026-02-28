"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConnectedAccounts } from "./ConnectedAccounts"
import { PostScheduler } from "./PostScheduler"
import { ContentCalendar } from "./ContentCalendar"
import { PublishingQueue } from "./PublishingQueue"
import { AnalyticsOverview } from "./AnalyticsOverview"
import { PlatformTrends } from "./PlatformTrends"

export function SocialDashboard() {
  const [activeTab, setActiveTab] = useState("accounts")

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <ConnectedAccounts />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <PostScheduler />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <ContentCalendar />
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <PublishingQueue />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsOverview />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <PlatformTrends />
        </TabsContent>
      </Tabs>
    </div>
  )
}
