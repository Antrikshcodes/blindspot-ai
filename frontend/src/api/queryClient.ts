import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@workspace/api-client-react';

/**
 * Configure the global React Query client with appropriate retry policies,
 * caching durations, and cache-clearing mechanisms for session transitions.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Do not retry on client authentication or validation errors
        if (error instanceof ApiError) {
          if ([400, 401, 403, 404, 422].includes(error.status)) {
            return false;
          }
        }
        const status = (error as { status?: number })?.status;
        if (status && [400, 401, 403, 404, 422].includes(status)) {
          return false;
        }
        // Limit retry for network/transient 5xx errors to 2 attempts
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // Never retry mutations automatically
    },
  },
});

/**
 * Completely clears the React Query cache.
 * Must be invoked whenever the authenticated user signs out or switches accounts
 * to prevent leaking cached project and analysis data across sessions.
 */
export function clearProtectedQueryCache(): void {
  queryClient.clear();
}
