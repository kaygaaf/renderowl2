"use client"

import { ReactNode } from "react"

// Check if we have a valid Clerk key
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""
const hasValidClerkKey = clerkKey.startsWith("pk_") && !clerkKey.includes("placeholder") && clerkKey.length > 20

// Dynamically import Clerk only if we have a valid key
let ClerkComponents: any = null
if (hasValidClerkKey) {
  try {
    ClerkComponents = require("@clerk/nextjs")
  } catch (e) {
    console.warn("Clerk not available")
  }
}

interface ClerkProviderWrapperProps {
  children: ReactNode
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  // If no valid Clerk key or Clerk not available, just render children
  if (!hasValidClerkKey || !ClerkComponents) {
    return <>{children}</>
  }

  const { ClerkProvider } = ClerkComponents
  
  return <ClerkProvider>{children}</ClerkProvider>
}

// Export SignIn/SignUp components that work with or without Clerk
export function SignInWrapper(props: any) {
  if (!ClerkComponents) {
    return <div className="p-8 text-center">Sign in is not configured</div>
  }
  return <ClerkComponents.SignIn {...props} />
}

export function SignUpWrapper(props: any) {
  if (!ClerkComponents) {
    return <div className="p-8 text-center">Sign up is not configured</div>
  }
  return <ClerkComponents.SignUp {...props} />
}
