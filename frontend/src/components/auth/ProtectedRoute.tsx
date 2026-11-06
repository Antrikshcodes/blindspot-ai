import React from 'react';
import { useAuth, RedirectToSignIn } from '@clerk/clerk-react';
import { LoadingState } from '../common/StatusStates';
import { ShieldAlert } from 'lucide-react';
import { MagneticButton } from '../common/MagneticButton';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // If Clerk is not configured yet, show a developer-friendly message
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
        <div className="p-8 rounded-3xl bg-sand-light border-2 border-forest/20 max-w-md mx-auto text-forest space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Authentication Required</h3>
          <p className="text-xs sm:text-sm text-forest/80 leading-relaxed font-sans">
            This workspace view is protected by Clerk. Configure <code className="bg-forest/10 px-1 py-0.5 rounded text-purple">VITE_CLERK_PUBLISHABLE_KEY</code> in <code className="bg-forest/10 px-1 py-0.5 rounded text-purple">.env</code> to activate authenticated project management.
          </p>
          <div className="pt-2">
            <MagneticButton variant="forest" size="sm" onClick={() => window.location.href = '/'}>
              Return to Landing Page
            </MagneticButton>
          </div>
        </div>
      </div>
    );
  }

  const { isLoaded, isSignedIn } = useAuth();

  // Show branded loading spinner while verifying token and session status
  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingState message="Checking session authorization..." />
      </div>
    );
  }

  // If not signed in, redirect to Clerk sign-in experience while preserving path
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
};

