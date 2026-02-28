'use client';

import { 
  ClerkProvider, 
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useSession,
  SignInButton,
  SignOutButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react';
import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { api } from '@/lib/api';

// Auth context type
interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  userId: string | null | undefined;
  user: ReturnType<typeof useClerkUser>['user'];
  getToken: () => Promise<string | null>;
  backendUser: BackendUser | null;
  credits: number;
  syncUser: () => Promise<void>;
}

// Backend user type
interface BackendUser {
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

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
  publishableKey: string;
}

/**
 * Auth Provider - Wraps Clerk and provides backend user sync
 */
function AuthProviderInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useClerkAuth();
  const { user } = useClerkUser();
  const { session } = useSession();
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [credits, setCredits] = useState(0);

  // Set up API token provider
  useEffect(() => {
    if (getToken) {
      api.setTokenProvider(getToken);
    }
  }, [getToken]);

  /**
   * Sync Clerk user with backend
   */
  const syncUser = useCallback(async () => {
    if (!isSignedIn || !user || !getToken) {
      setBackendUser(null);
      setCredits(0);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        console.warn('[AuthContext] No token available');
        return;
      }

      // Try to get existing user from backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/auth/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        setBackendUser({
          ...userData,
          clerkId: user.id,
          imageUrl: user.imageUrl,
        });
        setCredits(userData.credits || 0);
      } else if (response.status === 404) {
        // User doesn't exist in backend - create them
        await createBackendUser();
      } else {
        console.error('[AuthContext] Failed to sync user:', response.status);
      }
    } catch (error) {
      console.error('[AuthContext] Error syncing user:', error);
    }
  }, [isSignedIn, user, getToken]);

  /**
   * Create user in backend
   */
  const createBackendUser = async () => {
    if (!user || !getToken) return;

    try {
      const token = await getToken();
      const primaryEmail = user.primaryEmailAddress?.emailAddress || '';

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/auth/sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clerkId: user.id,
            email: primaryEmail,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
          }),
        }
      );

      if (response.ok) {
        const userData = await response.json();
        setBackendUser({
          ...userData,
          clerkId: user.id,
          imageUrl: user.imageUrl,
        });
        setCredits(userData.credits || 0);
      } else {
        console.error('[AuthContext] Failed to create backend user:', response.status);
      }
    } catch (error) {
      console.error('[AuthContext] Error creating backend user:', error);
    }
  };

  // Sync user when auth state changes
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      syncUser();
    } else if (isLoaded && !isSignedIn) {
      setBackendUser(null);
      setCredits(0);
    }
  }, [isLoaded, isSignedIn, syncUser]);

  const value: AuthContextType = {
    isLoaded,
    isSignedIn,
    userId,
    user,
    getToken,
    backendUser,
    credits,
    syncUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * AuthProvider - Main wrapper that includes ClerkProvider
 */
export function AuthProvider({ children, publishableKey }: AuthProviderProps) {
  return (
    <ClerkProvider 
      publishableKey={publishableKey}
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
    >
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </ClerkProvider>
  );
}

/**
 * useAuth - Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export Clerk components for convenience
export {
  SignInButton,
  SignOutButton,
  SignedIn,
  SignedOut,
  UserButton,
  useClerkAuth,
  useClerkUser,
  useSession,
};
