'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthContextType {
  isSignedIn: boolean
  user: any
  isLoaded: boolean
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: true, // DEMO MODE
  user: { id: 'demo', email: 'demo@renderowl.com' },
  isLoaded: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  // DEMO MODE - Always signed in
  return (
    <AuthContext.Provider value={{ 
      isSignedIn: true, 
      user: { id: 'demo', email: 'demo@renderowl.com' },
      isLoaded: true 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
