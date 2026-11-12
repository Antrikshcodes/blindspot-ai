# Authentication and profile roles

## Browser flow

The React application uses Clerk's browser provider and protected routes. Users
sign in through Clerk's hosted components; the browser sends the resulting
session cookie to the API. API requests use the same site where possible. For a
separate frontend/API origin, configure the exact frontend origin in the API's
`CORS_ORIGIN` and Clerk's authorized origins. Cookie-authenticated writes must
include that `Origin`; cross-site and originless writes are rejected.

## API clients

A non-browser client may send `Authorization: Bearer <Clerk session JWT>`. The
backend verifies the JWT signature, expiry, issuer and authorized party. API
keys, user IDs in headers, request bodies, query strings or unverified token
claims are not accepted as identity. Missing provider configuration fails
closed with `503 AUTH_NOT_READY`; invalid or missing sessions receive
`401 UNAUTHENTICATED`.

## User profile and roles

`GET /api/user/profile` returns the verified subject's saved profile and role.
`PATCH /api/user/profile` changes only `displayName`. The request schema rejects
`ownerId`, `userId`, `role` and other unknown properties. Role is derived by the
server from `ADMIN_USER_IDS`, a comma-separated list of Clerk subject IDs. An
empty list assigns `USER` to everyone. Keep the variable server-side and audit
changes to it as privileged configuration.

## Verification and limits

Offline API tests cover invalid/expired identities, cross-user isolation,
origin checks, profile ownership and role-escalation attempts. These tests do
not replace a live browser sign-in test against the configured Clerk instance.
No production deployment or live-user data change is part of local testing.
