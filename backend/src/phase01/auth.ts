import { clerkMiddleware, getAuth, type ClerkMiddlewareOptions } from '@clerk/express';
import { publishableKeyFromHost } from '@clerk/shared/keys';
import type { RequestHandler, Response } from 'express';
import { ApiError } from './config.js';
import { getClerkProxyHost } from './middlewares/clerkProxyMiddleware.js';

// Server-owned configuration seam for offline signature tests, never request data.
export type AuthConfiguration = Pick<ClerkMiddlewareOptions,
  'publishableKey' | 'secretKey' | 'jwtKey' | 'authorizedParties'>;

export function ownerId(res: Response): string {
  const owner: unknown = res.locals.ownerId;
  if (typeof owner !== 'string' || !owner) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to access your projects.');
  return owner;
}

export function authentication(settings?: AuthConfiguration): RequestHandler {
  const publishableKey = settings?.publishableKey ?? process.env.CLERK_PUBLISHABLE_KEY;
  const secretKey = settings?.secretKey ?? process.env.CLERK_SECRET_KEY;
  // Preserve the production fail-closed boundary (also in development). There
  // is no anonymous/dev user and no user-ID header fallback.
  if (!publishableKey || !secretKey) {
    return (_req, _res, next) => next(new ApiError(503, 'AUTH_NOT_READY', 'Authenticated access is not configured.'));
  }
  const middleware = clerkMiddleware(req => ({
    ...settings,
    secretKey,
    authorizedParties: settings?.authorizedParties ?? [
      `${req.headers['x-forwarded-proto'] ?? req.protocol}://${getClerkProxyHost(req)}`,
    ],
    publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? '', publishableKey),
  }));
  return (req, res, next) => {
    const authorization = req.headers.authorization;
    // A malformed Authorization header must not fall back to cookies and then
    // accidentally opt a cookie-authenticated write out of origin checking.
    if (authorization && !/^Bearer [^\s]+$/i.test(authorization)) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Sign in to access your projects.'));
      return;
    }
    middleware(req, res, error => {
      if (error) {
        next(new ApiError(401, 'UNAUTHENTICATED', 'Sign in to access your projects.'));
        return;
      }
      const auth = getAuth(req, { acceptsToken: 'session_token' });
      // Use the verified provider subject, never custom claims/userId/body/header.
      if (!auth.isAuthenticated || !auth.userId) {
        next(new ApiError(401, 'UNAUTHENTICATED', 'Sign in to access your projects.'));
        return;
      }
      // Defend cookie-authenticated writes from cross-site requests, including
      // requests with no Origin (which Clerk's azp check alone does not reject).
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !authorization) {
        const origin = req.headers.origin;
        const host = getClerkProxyHost(req);
        const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
        if (req.headers['sec-fetch-site'] === 'cross-site'
          || !origin || origin !== `${proto}://${host}`) {
          next(new ApiError(403, 'ORIGIN_REJECTED', 'A same-origin request is required.'));
          return;
        }
      }
      res.locals.ownerId = auth.userId;
      next();
    });
  };
}
