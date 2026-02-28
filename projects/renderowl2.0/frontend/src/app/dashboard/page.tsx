'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { TimelineResponse } from '@/lib/api';

/**
 * Dashboard Page - User's main dashboard
 * 
 * Features:
 * - Shows user profile and credits
 * - Lists user's timelines
 * - Quick actions (new project, open editor)
 * - Credit usage display
 */
interface DashboardData {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    credits: number;
  } | null;
  timelines: TimelineResponse[];
  credits: {
    credits: number;
    used: number;
    remaining: number;
  } | null;
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user, backendUser, credits: userCredits, syncUser } = useAuth();
  const router = useRouter();
  
  const [data, setData] = useState<DashboardData>({
    user: null,
    timelines: [],
    credits: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/auth?redirect=' + encodeURIComponent('/dashboard'));
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Ensure user is synced with backend
        await syncUser();

        // Fetch user timelines
        const timelines = await api.getUserTimelines();

        // Fetch credit info
        const credits = await api.getUserCredits().catch(() => null);

        setData({
          user: {
            id: backendUser?.id || user?.id || '',
            email: backendUser?.email || user?.primaryEmailAddress?.emailAddress || '',
            firstName: backendUser?.firstName || user?.firstName || null,
            lastName: backendUser?.lastName || user?.lastName || null,
            imageUrl: backendUser?.imageUrl || user?.imageUrl || null,
            credits: backendUser?.credits || userCredits || 0,
          },
          timelines,
          credits,
        });
      } catch (err) {
        console.error('[Dashboard] Error fetching data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isLoaded, isSignedIn, user, backendUser, userCredits, syncUser]);

  // Create new timeline
  const handleCreateTimeline = async () => {
    try {
      setLoading(true);
      const newTimeline = await api.createTimeline({
        title: 'New Project',
        description: 'Created from dashboard',
      });
      
      // Add to list
      setData(prev => ({
        ...prev,
        timelines: [newTimeline, ...prev.timelines],
      }));

      // Navigate to editor
      router.push(`/editor/${newTimeline.id}`);
    } catch (err) {
      console.error('[Dashboard] Error creating timeline:', err);
      setError('Failed to create new project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayName = data.user?.firstName 
    ? `${data.user.firstName} ${data.user.lastName || ''}`
    : data.user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="text-xl font-bold text-gray-900">
                Renderowl 2.0
              </a>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">Dashboard</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Credits Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">
                  {data.credits?.remaining ?? data.user?.credits ?? 0} credits
                </span>
              </div>

              {/* User Avatar */}
              <div className="flex items-center gap-2">
                {data.user?.imageUrl ? (
                  <img
                    src={data.user.imageUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - User Info & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-4 mb-4">
                {data.user?.imageUrl ? (
                  <img
                    src={data.user.imageUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                  <p className="text-gray-500">{data.user?.email}</p>
                </div>
              </div>

              <a
                href="/settings"
                className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Edit Profile
              </a>
            </div>

            {/* Credits Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Credits</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Credits</span>
                  <span className="font-semibold">{data.credits?.credits ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Used</span>
                  <span className="font-semibold text-orange-600">{data.credits?.used ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-semibold text-green-600">{data.credits?.remaining ?? data.user?.credits ?? 0}</span>
                </div>

                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        ((data.credits?.used ?? 0) / (data.credits?.credits || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <a
                href="/pricing"
                className="block w-full text-center mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Buy More Credits
              </a>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleCreateTimeline}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </button>

                <a
                  href="/editor"
                  className="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-center"
                >
                  Open Editor
                </a>
              </div>
            </div>
          </div>

          {/* Right Column - Projects */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Projects</h3>
                <button
                  onClick={handleCreateTimeline}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  + New Project
                </button>
              </div>

              <div className="p-6">
                {data.timelines.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-300 text-6xl mb-4">🎬</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h4>
                    <p className="text-gray-600 mb-6">
                      Create your first video project to get started
                    </p>
                    <button
                      onClick={handleCreateTimeline}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.timelines.map((timeline) => (
                      <div
                        key={timeline.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            🎬
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{timeline.title}</h4>
                            <p className="text-sm text-gray-500">
                              {timeline.description || 'No description'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Created {new Date(timeline.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            timeline.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {timeline.status}
                          </span>
                          <a
                            href={`/editor/${timeline.id}`}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
