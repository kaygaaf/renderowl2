// middleware.ts - Demo mode: no authentication required
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default function middleware(request: NextRequest) {
  // Allow all requests - demo mode
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
