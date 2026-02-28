"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Film,
  Wand2,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Share2,
  Sparkles,
} from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarProps {
  className?: string
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Factory", href: "/dashboard/batch", icon: Sparkles },
  { name: "My Videos", href: "/dashboard/videos", icon: Film },
  { name: "Social", href: "/dashboard/social", icon: Share2 },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Templates", href: "/templates", icon: Wand2 },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Collapse Button */}
          <div className="flex justify-end p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              const Icon = item.icon

              return (
                <Tooltip key={item.name} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="flex items-center gap-4">
                      {item.name}
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </nav>

          {/* Credits Section */}
          {!collapsed && (
            <div className="border-t p-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Credits Remaining</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-bold">850</span>
                  <span className="text-xs text-muted-foreground">/ 1,000</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-blue-600 to-purple-600" />
                </div>
                <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
                  Upgrade Plan
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
