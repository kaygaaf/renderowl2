import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Check if Clerk is configured
const clerkConfigured = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder'

export function middleware(request: NextRequest) {
  // For now, allow all access (development mode)
  // TODO: Re-enable auth when Clerk keys are configured
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
