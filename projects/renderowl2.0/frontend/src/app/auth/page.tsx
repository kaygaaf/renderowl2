'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';

/**
 * Auth Page - Handles sign in and sign up
 * 
 * This page:
 * - Shows Clerk sign-in/sign-up components
 * - Redirects to dashboard after successful auth
 * - Handles redirect URLs for post-login navigation
 */
export default function AuthPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Decode and navigate to redirect URL
      const decodedRedirect = decodeURIComponent(redirectUrl);
      router.push(decodedRedirect);
    }
  }, [isLoaded, isSignedIn, redirectUrl, router]);

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-xl font-bold text-gray-900">
            Renderowl 2.0
          </a>
        </div>
      </header>

      {/* Auth Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Renderowl
              </h1>
              <p className="text-gray-600">
                Sign in or create an account to start editing
              </p>
            </div>

            {/* Clerk Sign In Component */}
            <SignIn 
              routing="hash"
              redirectUrl={redirectUrl}
              appearance={{
                layout: {
                  socialButtonsPlacement: 'bottom',
                  socialButtonsVariant: 'iconButton',
                },
                variables: {
                  colorPrimary: '#2563eb',
                  colorText: '#1f2937',
                  colorBackground: '#ffffff',
                  colorInputBackground: '#f9fafb',
                  colorInputText: '#1f2937',
                  borderRadius: '0.5rem',
                },
              }}
            />

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <a 
                  href="#" 
                  className="text-blue-600 hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    // Switch to sign up
                    const signUpUrl = new URL(window.location.href);
                    signUpUrl.searchParams.set('mode', 'signup');
                    window.history.pushState({}, '', signUpUrl);
                  }}
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-6 text-center">
            <a 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-gray-500 text-center">
            Renderowl 2.0 — Professional video editing in your browser
          </p>
        </div>
      </footer>
    </div>
  );
}
