'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Timeline } from '@/components/timeline';
import { useTimelineStore } from '@/store/timelineStore';

/**
 * Editor Page - Video editing interface
 * 
 * This is the main video editing page where users can:
 * - Edit timelines
 * - Add/remove clips
 * - Preview videos
 * - Export projects
 */
export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const timelineId = params.id as string;
  
  const { isLoaded, isSignedIn } = useAuth();
  const { loadTimeline, timelineId: loadedTimelineId } = useTimelineStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineTitle, setTimelineTitle] = useState('Untitled Project');

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(`/auth?redirect=${encodeURIComponent(`/editor/${timelineId}`)}`);
    }
  }, [isLoaded, isSignedIn, router, timelineId]);

  // Load timeline data
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !timelineId) return;

    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const timeline = await api.getTimeline(parseInt(timelineId));
        setTimelineTitle(timeline.title);
        await loadTimeline(parseInt(timelineId));
      } catch (err) {
        console.error('[Editor] Error loading timeline:', err);
        setError('Failed to load timeline. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [isLoaded, isSignedIn, timelineId, loadTimeline]);

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800 rounded-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Timeline</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Editor Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <div>
              <input
                type="text"
                value={timelineTitle}
                onChange={(e) => setTimelineTitle(e.target.value)}
                className="bg-transparent text-white font-semibold text-lg focus:outline-none focus:bg-gray-700 px-2 py-1 rounded"
              />
              <p className="text-xs text-gray-500">
                Project #{timelineId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Preview
            </button>
            
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 flex">
        {/* Left Sidebar - Media Library */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white">Media Library</h3>
          </div>
          <div className="flex-1 p-4">
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">Drag and drop media here</p>
              <button className="mt-4 px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600">
                + Upload Media
              </button>
            </div>
          </div>
        </aside>

        {/* Center - Preview & Timeline */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 bg-black flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Video Preview</p>
              <p className="text-gray-600 text-sm mt-2">Select a clip to preview</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-[300px] bg-gray-800 border-t border-gray-700">
            <Timeline className="h-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
