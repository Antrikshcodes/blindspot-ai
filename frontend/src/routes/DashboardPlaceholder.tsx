import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useHealthCheck } from '../api/client';
import { LoadingState, ErrorState } from '../components/common/StatusStates';
import { ShieldCheck, Activity, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPlaceholder: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  // Test real live frontend-to-backend connectivity via the generated React Query hook
  const { data: healthData, isLoading, isError, error, refetch } = useHealthCheck({
    query: {
      retry: 1,
    },
  });

  return (
    <div className="min-h-screen bg-sand text-forest px-4 sm:px-6 md:px-10 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Back */}
        <div className="flex items-center justify-between pb-6 border-b border-forest/15">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-forest/70 hover:text-forest transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </button>
          <div className="text-xs font-mono text-forest/50">
            ROUTE: /dashboard [PROTECTED]
          </div>
        </div>

        {/* User Identity Welcome Card */}
        <div className="p-8 rounded-3xl bg-sand-light border-2 border-forest/20 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-purple/15 text-purple border border-purple/30 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Authenticated Session Verified
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-forest">
                Welcome, {user?.firstName || user?.username || 'Builder'}
              </h1>
            </div>
            <div className="text-xs font-mono text-forest/60 bg-forest/5 p-2 rounded-xl">
              User ID: <span className="font-bold text-forest">{user?.id}</span>
            </div>
          </div>
          <p className="text-sm text-forest/80 leading-relaxed font-sans max-w-xl">
            You are securely authenticated through Clerk. Your session tokens are automatically attached to all outgoing validation requests.
          </p>
        </div>

        {/* Live Backend Connection Probe */}
        <div className="p-8 rounded-3xl bg-sand-light border-2 border-forest/20 shadow-md">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-forest/10">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-purple" />
              <h2 className="text-xl font-bold tracking-tight text-forest">
                Live Backend Connection Diagnostic
              </h2>
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-forest/50">
              GET /api/healthz
            </span>
          </div>

          {isLoading ? (
            <LoadingState message="Probing live backend API health..." />
          ) : isError ? (
            <ErrorState
              status={(error as any)?.status}
              code={(error as any)?.data?.error?.code || 'BACKEND_OFFLINE'}
              message="Could not reach the backend development server. Ensure the backend is running with 'npm run dev' on port 3000."
              onRetry={() => refetch()}
            />
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-forest/5 border border-forest/15 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-forest/60">Service Status:</span>
                  <span className="font-bold text-forest bg-forest/10 px-2 py-0.5 rounded">
                    {healthData?.data?.status || 'ok'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-forest/60">Network Protocol:</span>
                  <span className="font-bold text-forest bg-forest/10 px-2 py-0.5 rounded">
                    HTTP/1.1 (Vite Proxy: /api -&gt; Backend)
                  </span>
                </div>
              </div>
              <p className="text-xs font-mono text-forest/60">
                ✓ Full-stack integration active: Client SDK is communicating with the backend over the Vite proxy.
              </p>
            </div>
          )}
        </div>

        {/* Next Stage Note */}
        <div className="text-center pt-4 text-xs font-mono text-forest/50">
          Application Interface Foundation Ready · Dashboard Workspace implementation scheduled for subsequent prompt.
        </div>

      </div>
    </div>
  );
};
