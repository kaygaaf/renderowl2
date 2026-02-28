import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// User profile response type
export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

// User credits response type
export interface UserCredits {
  credits: number;
  used: number;
  remaining: number;
}

/**
 * Get the current authenticated user with backend sync
 * This function:
 * 1. Validates the Clerk session
 * 2. Gets the Clerk user
 * 3. Syncs/retrieves the user from backend
 * 4. Returns combined user data
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    // Get Clerk user details
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }

    // Get session token for backend API
    const session = await auth();
    const token = await session.getToken();

    if (!token) {
      console.error('[Auth] No session token available');
      return null;
    }

    // Call backend to sync/get user
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If backend user doesn't exist yet, create it
      if (response.status === 404) {
        return createBackendUser(clerkUser, token);
      }
      
      console.error('[Auth] Backend user fetch failed:', response.status);
      // Return basic user data from Clerk as fallback
      return mapClerkUserToProfile(clerkUser);
    }

    const backendUser = await response.json();
    return {
      ...backendUser,
      clerkId: clerkUser.id,
      imageUrl: clerkUser.imageUrl,
    };
  } catch (error) {
    console.error('[Auth] Error getting current user:', error);
    return null;
  }
}

/**
 * Create a new user in the backend
 */
async function createBackendUser(clerkUser: any, token: string): Promise<UserProfile | null> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    
    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
    
    const response = await fetch(`${API_URL}/auth/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clerkId: clerkUser.id,
        email: primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      }),
    });

    if (!response.ok) {
      console.error('[Auth] Failed to create backend user:', response.status);
      return mapClerkUserToProfile(clerkUser);
    }

    const backendUser = await response.json();
    return {
      ...backendUser,
      clerkId: clerkUser.id,
      imageUrl: clerkUser.imageUrl,
    };
  } catch (error) {
    console.error('[Auth] Error creating backend user:', error);
    return mapClerkUserToProfile(clerkUser);
  }
}

/**
 * Map Clerk user to our UserProfile format
 */
function mapClerkUserToProfile(clerkUser: any): UserProfile {
  const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
  
  return {
    id: clerkUser.id,
    clerkId: clerkUser.id,
    email: primaryEmail,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    credits: 0, // Default credits for new users
    createdAt: new Date(clerkUser.createdAt).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get user credits from backend
 */
export async function getUserCredits(): Promise<UserCredits | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const session = await auth();
    const token = await session.getToken();

    if (!token) {
      return null;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    
    const response = await fetch(`${API_URL}/auth/credits`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Auth] Error getting user credits:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.redirect(new URL('/auth', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
  
  return null;
}
