import { generateKeyPairSync, sign } from 'node:crypto';
import supertest from 'supertest';
import { createApp } from '../../src/phase01/app.js';
import type { AuthConfiguration } from '../../src/phase01/auth.js';

// Ephemeral offline keys exercise the real Clerk signature/expiry verifier.
// Never a mock identity middleware or a caller-controlled user-ID shortcut.
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
export const testOrigin = 'http://localhost';
export const testOwner = 'user_founder_a';
export const testAuth: AuthConfiguration = {
  publishableKey: `pk_test_${Buffer.from('auth-fixture.clerk.accounts.dev$').toString('base64')}`,
  secretKey: 'sk_test_offline_signature_fixture',
  jwtKey: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  authorizedParties: [testOrigin],
};
export function sessionToken(subject = testOwner, claims: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'offline' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    sub: subject, sid: 'sess_offline', iss: 'https://auth-fixture.clerk.accounts.dev',
    azp: testOrigin, iat: now - 1, nbf: now - 1, exp: now + 300, ...claims,
  })).toString('base64url');
  const message = `${header}.${body}`;
  return `${message}.${sign('RSA-SHA256', Buffer.from(message), keys.privateKey).toString('base64url')}`;
}
export function createAuthenticatedApp(deps: Parameters<typeof createApp>[0]) {
  return createApp({ ...deps, auth: testAuth });
}
export function authenticatedRequest(app: Parameters<typeof supertest>[0]) {
  const agent = supertest(app);
  const headers = { Authorization: `Bearer ${sessionToken()}` };
  return {
    get: (path: string) => agent.get(path).set(headers),
    post: (path: string) => agent.post(path).set(headers),
    patch: (path: string) => agent.patch(path).set(headers),
    delete: (path: string) => agent.delete(path).set(headers),
  };
}
