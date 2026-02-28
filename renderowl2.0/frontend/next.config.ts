import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    // Use a valid test key format for build time
    // In production, set the real key via environment variable
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_aW52YWxpZC5jbGVyay5hY2NvdW50cy5kZXYk',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_invalid',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/auth',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/auth',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/dashboard',
  },
  // Transpile Remotion packages
  transpilePackages: ['@remotion/player'],
};

export default nextConfig;
