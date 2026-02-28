"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { timelineApi, setTokenGetter } from "@/lib/api"

// Try to import Clerk, fallback to null if not available
let clerkUseUser: any = null
let clerkUseAuth: any = null
try {
  const clerk = require("@clerk/nextjs")
  clerkUseUser = clerk.useUser
  clerkUseAuth = clerk.useAuth
} catch (e) {
  // Clerk not available
}

interface Project {
  id: string
  title: string
  description?: string
  status: "draft" | "processing" | "completed" | "failed"
  thumbnail?: string
  duration: number
  createdAt: string
  updatedAt: string
  userId: string
}

interface UserData {
  id: string
  email: string
  name: string
  avatar?: string
  credits: number
  plan: "free" | "pro" | "enterprise"
}

interface AuthContextType {
  // Clerk user data
  user: any
  isLoaded: boolean
  isSignedIn: boolean
  
  // Backend user data
  userData: UserData | null
  projects: Project[]
  projectsLoading: boolean
  projectsError: string | null
  
  // Actions
  refreshProjects: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use Clerk hooks if available, otherwise fallback
  const clerkUser = clerkUseUser ? clerkUseUser() : { user: null, isLoaded: true }
  const clerkAuth = clerkUseAuth ? clerkUseAuth() : { isSignedIn: false, signOut: async () => {}, getToken: async () => null }
  
  const { user, isLoaded } = clerkUser
  const { isSignedIn, signOut: clerkSignOut, getToken } = clerkAuth
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  // Set up the token getter for API calls
  useEffect(() => {
    if (getToken) {
      setTokenGetter(getToken)
    }
  }, [getToken])

  // Map Clerk user to our UserData format
  useEffect(() => {
    if (user) {
      setUserData({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.firstName || "User",
        avatar: user.imageUrl,
        credits: 1000, // TODO: Fetch from backend
        plan: "free", // TODO: Fetch from backend
      })
    } else {
      setUserData(null)
    }
  }, [user])

  // Fetch projects from backend
  const refreshProjects = async () => {
    if (!isSignedIn) {
      setProjects([])
      return
    }

    setProjectsLoading(true)
    setProjectsError(null)

    try {
      const response = await timelineApi.list()
      // Map backend timeline data to frontend Project format
      const mappedProjects: Project[] = response?.map((timeline: any) => ({
        id: timeline.id,
        title: timeline.name,
        description: timeline.description,
        status: timeline.status || "draft",
        duration: timeline.duration || 0,
        createdAt: timeline.created_at,
        updatedAt: timeline.updated_at,
        userId: timeline.user_id,
      })) || []
      setProjects(mappedProjects)
    } catch (error: any) {
      console.error("Failed to fetch projects:", error)
      setProjectsError(error.response?.data?.error || "Failed to load projects")
      // Don't clear existing projects on error, just show error state
    } finally {
      setProjectsLoading(false)
    }
  }

  // Load projects when user signs in
  useEffect(() => {
    if (isSignedIn) {
      refreshProjects()
    } else {
      setProjects([])
    }
  }, [isSignedIn])

  const handleSignOut = async () => {
    if (clerkSignOut) {
      await clerkSignOut()
    }
    setUserData(null)
    setProjects([])
  }

  const value: AuthContextType = {
    user,
    isLoaded,
    isSignedIn: isSignedIn || false,
    userData,
    projects,
    projectsLoading,
    projectsError,
    refreshProjects,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Hook for accessing user data specifically
export function useUserData() {
  const { userData, isLoaded, isSignedIn } = useAuth()
  return { userData, isLoaded, isSignedIn }
}

// Hook for accessing projects
export function useProjects() {
  const { projects, projectsLoading, projectsError, refreshProjects } = useAuth()
  return { projects, projectsLoading, projectsError, refreshProjects }
}
