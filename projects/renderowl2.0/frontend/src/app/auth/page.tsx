'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleDemoLogin = () => {
    setIsLoading(true)
    // Demo mode - just redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Renderowl</h2>
          <p className="mt-2 text-gray-600">Demo Mode - No signup required</p>
        </div>

        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Enter Demo Mode'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Auth will be added later. Testing mode enabled.
        </p>
      </div>
    </div>
  )
}
