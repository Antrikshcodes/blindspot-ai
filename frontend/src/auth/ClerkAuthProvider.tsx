import React, { useEffect, useRef } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { setupApiClient } from '../api/client';
import { clearProtectedQueryCache } from '../api/queryClient';
import { ShieldAlert } from 'lucide-react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Internal bridge component that connects the active Clerk authentication session
 * to the API client fetcher and isolates React Query caches across user transitions.
 */
const AuthTokenBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken, userId, isSignedIn } = useAuth();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Connect Clerk token acquisition to customFetch
    setupApiClient(async () => {
      if (!isSignedIn) return null;
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken, isSignedIn]);

  useEffect(() => {
    // If user changes or logs out, purge protected queries from cache
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
      clearProtectedQueryCache();
    }
    prevUserIdRef.current = userId;
  }, [userId]);

  return <>{children}</>;
};

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

export const ClerkAuthProvider: React.FC<ClerkAuthProviderProps> = ({ children }) => {
  // If Clerk key is not configured, inform the user while allowing landing page exploration
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="relative">
        <div className="bg-forest-dark text-sand px-4 py-2 text-xs font-mono flex items-center justify-between border-b border-sand/20">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <ShieldAlert className="w-4 h-4 text-purple shrink-0" />
            <span>
              Authentication Standby: <code className="text-purple">VITE_CLERK_PUBLISHABLE_KEY</code> not configured. Public preview active.
            </span>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#8B5CF6',
          colorText: '#1F3D2B',
          colorBackground: '#E8DCC4',
          colorInputBackground: '#F4EFE6',
          colorInputText: '#1F3D2B',
          borderRadius: '0.75rem',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        },
        elements: {
          card: 'bg-sand border-2 border-forest/20 shadow-2xl rounded-3xl',
          formButtonPrimary:
            'bg-purple hover:bg-purple-hover text-white font-semibold rounded-full min-h-[44px] transition-colors',
          footerActionLink: 'text-purple hover:underline font-semibold',
        },
      }}
    >
      <AuthTokenBridge>{children}</AuthTokenBridge>
    </ClerkProvider>
  );
};

