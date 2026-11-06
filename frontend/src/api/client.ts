import { setBaseUrl, setAuthTokenGetter, type AuthTokenGetter } from '@workspace/api-client-react';

/**
 * Configure the API client base URL and Clerk token getter.
 * - In local development: relative '/api' paths are forwarded by Vite proxy to the backend.
 * - In production: VITE_API_BASE_URL can specify an explicit backend origin if hosted separately.
 */
export function setupApiClient(tokenGetter?: AuthTokenGetter | null): void {
  const customBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (customBaseUrl) {
    setBaseUrl(customBaseUrl);
  }

  if (tokenGetter !== undefined) {
    setAuthTokenGetter(tokenGetter);
  }
}

// Re-export all generated React Query hooks, types, schemas and error classes
export * from '@workspace/api-client-react';

