import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes (no authentication required)
const isPublicRoute = createRouteMatcher([
  '/',                    // Landing page
  '/pricing',             // Pricing page
  '/features',            // Features page
  '/about',               // About page
  '/contact',             // Contact page
  '/auth',                // Auth page (sign in/up)
  '/auth/(.*)',           // Auth sub-routes
  '/api/webhook/(.*)',    // Webhooks
  '/api/public/(.*)',     // Public API routes
  '/_next/(.*)',          // Next.js static files
  '/favicon.ico',         // Favicon
  '/robots.txt',          // SEO files
  '/sitemap.xml',         // SEO files
]);

// Define protected routes (authentication required)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',       // Dashboard and all sub-routes
  '/editor(.*)',          // Editor and all sub-routes
  '/profile(.*)',         // Profile and all sub-routes
  '/settings(.*)',        // Settings and all sub-routes
  '/api/protected(.*)',   // Protected API routes
]);

/**
 * Clerk Middleware for Renderowl 2.0
 * 
 * This middleware:
 * 1. Protects dashboard and editor routes
 * 2. Redirects unauthenticated users to /auth
 * 3. Stores redirect URL for post-login navigation
 * 4. Handles public routes without authentication
 */
export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();
  const { pathname, search } = req.nextUrl;

  // Check if this is a public route
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  if (isProtectedRoute(req)) {
    // User is not authenticated
    if (!userId) {
      // Store the current URL to redirect back after login
      const redirectUrl = encodeURIComponent(pathname + search);
      
      // Redirect to auth page with redirect parameter
      const authUrl = new URL(`/auth?redirect=${redirectUrl}`, req.url);
      return NextResponse.redirect(authUrl);
    }
  }

  // For all other routes, allow access
  // (You can add additional logic here if needed)
  return NextResponse.next();
});

/**
 * Middleware configuration
 * 
 * matcher:
 * - Apply middleware to all routes except static files and api routes
 * - Exclude Next.js internals (_next/static, _next/image)
 * - Include api routes that need auth protection
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - .*\.(?:jpg|jpeg|gif|png|svg|ico|webp|js|css|woff|woff2)$ (static assets)
     */
    '/((?!_next/static|_next/image|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|js|css|woff|woff2)$).*)',
  ],
};
