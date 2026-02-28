import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TEMPORARY: Auth disabled for testing
// TODO: Re-enable Clerk when ready
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
