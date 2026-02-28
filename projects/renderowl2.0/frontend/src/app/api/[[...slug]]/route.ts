/**
 * API Bridge
 * Connects frontend integrations to the Remotion backend
 * 
 * Endpoints:
 * - POST /api/render - Submit render job
 * - GET /api/render/:jobId - Get job status
 * - POST /api/render/:jobId/cancel - Cancel job
 * - GET /api/health - Health check
 * - POST /api/ai/script - Generate script with AI
 * - POST /api/ai/voice - Generate voiceover
 * - GET /api/ai/stock - Search stock media
 * - POST /api/assets/upload - Get upload URL
 * - POST /api/assets/:id/complete - Complete upload
 */

import { NextRequest, NextResponse } from 'next/server';

const REMOTION_API_URL = process.env.REMOTION_API_URL || 'http://localhost:3000';
const AI_API_URL = process.env.AI_API_URL || 'http://localhost:8080/api/v1/ai';
const ASSET_API_URL = process.env.ASSET_API_URL || 'http://localhost:8080/api/v1/assets';

// ============================================================================
// Render API Routes
// ============================================================================

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Submit render job
  if (pathname === '/api/render') {
    try {
      const body = await request.json();
      
      const response = await fetch(`${REMOTION_API_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to submit render job' },
        { status: 500 }
      );
    }
  }

  // Cancel render job
  if (pathname.match(/\/api\/render\/[^/]+\/cancel/)) {
    const jobId = pathname.split('/')[3];
    try {
      const response = await fetch(`${REMOTION_API_URL}/render/${jobId}/cancel`, {
        method: 'POST',
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to cancel render job' },
        { status: 500 }
      );
    }
  }

  // AI Script Generation
  if (pathname === '/api/ai/script') {
    try {
      const body = await request.json();
      
      const response = await fetch(`${AI_API_URL}/scripts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate script' },
        { status: 500 }
      );
    }
  }

  // AI Voice Generation
  if (pathname === '/api/ai/voice') {
    try {
      const body = await request.json();
      
      const response = await fetch(`${AI_API_URL}/voice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate voiceover' },
        { status: 500 }
      );
    }
  }

  // Asset Upload
  if (pathname === '/api/assets/upload') {
    try {
      const body = await request.json();
      
      const response = await fetch(`${ASSET_API_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get upload URL' },
        { status: 500 }
      );
    }
  }

  // Complete Asset Upload
  if (pathname.match(/\/api\/assets\/[^/]+\/complete/)) {
    const assetId = pathname.split('/')[3];
    try {
      const response = await fetch(`${ASSET_API_URL}/${assetId}/complete`, {
        method: 'POST',
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to complete upload' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;

  // Get render job status
  if (pathname.match(/\/api\/render\/[^/]+$/)) {
    const jobId = pathname.split('/')[3];
    try {
      const response = await fetch(`${REMOTION_API_URL}/render/${jobId}`);
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get job status' },
        { status: 500 }
      );
    }
  }

  // Health check
  if (pathname === '/api/health') {
    try {
      const response = await fetch(`${REMOTION_API_URL}/health`);
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { status: 'unhealthy', error: 'Remotion server unavailable' },
        { status: 503 }
      );
    }
  }

  // Search stock media
  if (pathname === '/api/ai/stock') {
    const query = searchParams.get('query');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') || '10';

    try {
      const response = await fetch(
        `${AI_API_URL}/stock/search?query=${encodeURIComponent(query || '')}&type=${type}&limit=${limit}`
      );
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to search stock media' },
        { status: 500 }
      );
    }
  }

  // List assets
  if (pathname === '/api/assets') {
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') || '20';

    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (type) params.append('type', type);
      params.append('limit', limit);

      const response = await fetch(`${ASSET_API_URL}?${params.toString()}`);
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to list assets' },
        { status: 500 }
      );
    }
  }

  // Get asset
  if (pathname.match(/\/api\/assets\/[^/]+$/) && !pathname.includes('/complete')) {
    const assetId = pathname.split('/')[3];
    try {
      const response = await fetch(`${ASSET_API_URL}/${assetId}`);
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get asset' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Delete asset
  if (pathname.match(/\/api\/assets\/[^/]+$/)) {
    const assetId = pathname.split('/')[3];
    try {
      await fetch(`${ASSET_API_URL}/${assetId}`, {
        method: 'DELETE',
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to delete asset' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Update asset
  if (pathname.match(/\/api\/assets\/[^/]+$/)) {
    const assetId = pathname.split('/')[3];
    try {
      const body = await request.json();
      const response = await fetch(`${ASSET_API_URL}/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to update asset' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
