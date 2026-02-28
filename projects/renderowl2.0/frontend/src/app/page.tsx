'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Timeline } from '@/components/timeline';
import { useTimelineStore, useTimelineLoading, useTimelineSaving, useTimelineError, useLastSaved } from '@/store/timelineStore';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { 
    loadTimeline, 
    createTimeline, 
    saveTimeline, 
    timelineId, 
    clearError,
    addClip,
  } = useTimelineStore();
  
  const isLoading = useTimelineLoading();
  const isSaving = useTimelineSaving();
  const error = useTimelineError();
  const lastSaved = useLastSaved();
  
  const { isSignedIn, isLoaded, user } = useAuth();
  const router = useRouter();

  // Load timeline on mount (demo: create new if none exists)
  useEffect(() => {
    const initTimeline = async () => {
      // For demo purposes, create a new timeline if none loaded
      if (!timelineId) {
        // Add some demo clips
        setTimeout(() => {
          addClip('track-1', {
            name: 'Intro Video',
            startTime: 0,
            duration: 5,
            trackId: 'track-1',
            type: 'video',
          });
          addClip('track-1', {
            name: 'Main Content',
            startTime: 5.5,
            duration: 10,
            trackId: 'track-1',
            type: 'video',
          });
          addClip('track-2', {
            name: 'Background Music',
            startTime: 0,
            duration: 15.5,
            trackId: 'track-2',
            type: 'audio',
          });
        }, 100);
      }
    };
    
    initTimeline();
  }, []);

  const handleCreateTimeline = async () => {
    await createTimeline('New Project', 'Created from frontend');
  };

  const handleLoadTimeline = async () => {
    // For demo, load timeline with ID 1
    await loadTimeline(1);
  };

  const handleSaveTimeline = async () => {
    await saveTimeline();
  };

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.push('/dashboard');
    } else {
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Renderowl 2.0</h1>
                <p className="text-sm text-muted-foreground">
                  Next-gen video editor
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateTimeline}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  New Timeline
                </button>
                <button
                  onClick={handleLoadTimeline}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 disabled:opacity-50"
                >
                  Load Timeline
                </button>
                <button
                  onClick={handleSaveTimeline}
                  disabled={isSaving || !timelineId}
                  className="px-3 py-1.5 text-xs bg-accent text-accent-foreground rounded hover:bg-accent/90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Timeline'}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              {/* Auth Buttons */}
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <div className="flex items-center gap-3">
                      <a
                        href="/dashboard"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        Dashboard
                      </a>
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                        {user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0) || 'U'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <a
                        href="/auth"
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Sign In
                      </a>
                      <button
                        onClick={handleGetStarted}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        Get Started
                      </button>
                    </div>
                  )}
                </>
              )}
              
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                v2.0.0-alpha
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!isSignedIn && (
        <section className="bg-gradient-to-b from-blue-50 to-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Professional Video Editing in Your Browser
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Create stunning videos with our powerful timeline editor. No downloads required.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
              >
                Get Started Free
              </button>
              <a
                href="/pricing"
                className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-lg font-medium"
              >
                View Pricing
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Status banner */}
          {error && (
            <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
              <span className="text-sm text-destructive">{error}</span>
              <button
                onClick={clearError}
                className="text-sm text-destructive hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Preview area placeholder */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">
                Video Preview
              </p>
              <p className="text-sm text-muted-foreground">
                Load a project to see the preview
              </p>
            </div>
          </div>

          {/* Timeline */}
          <Timeline className="h-[400px]" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Renderowl 2.0 — Connected to Backend API • Built with Next.js 15, Tailwind CSS, shadcn/ui, Zustand, @dnd-kit & Clerk Auth
          </p>
        </div>
      </footer>
    </div>
  );
}
