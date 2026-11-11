import type { QueryClient } from '@tanstack/react-query';

export const PAGE_SIZE = 20;

export type ApiErr = {
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
};

type ErrBody = {
  error?: { code?: string; message?: string };
  requestId?: string;
};

export function readError(e: unknown): ApiErr {
  if (!e) return { message: 'Unknown error' };
  const x = e as { status?: number; data?: unknown; message?: string };
  const body = (x.data && typeof x.data === 'object' ? x.data : null) as ErrBody | null;
  return {
    status: typeof x.status === 'number' ? x.status : undefined,
    code: body?.error?.code,
    message: body?.error?.message || x.message || 'Request failed',
    requestId: body?.requestId,
  };
}

export function isAnalysisMissing(e: unknown): boolean {
  const r = readError(e);
  return r.status === 404 && (!r.code || r.code === 'ANALYSIS_NOT_FOUND');
}

export function explainError(err: ApiErr): string | null {
  if (err.code === 'AUTH_NOT_READY')
    return 'This deployment blocks project data until authenticated project access ships. Nothing is being bypassed.';
  if (err.status === 429)
    return 'Rate limit or AI capacity reached (at most 2 concurrent AI operations, 10 AI calls per minute). Wait a moment and retry.';
  if (err.status === 503) return 'A required service or provider is disabled or unavailable right now.';
  if (err.status === 502) return 'The upstream model or provider returned invalid or unavailable output. Retrying may help.';
  if (err.status === 413) return 'The submission exceeds a server size limit.';
  if (err.status === 409) return 'That state transition is not allowed from the current status.';
  if (err.status === 0 || err.status === undefined) return 'Could not reach the API service.';
  return null;
}

export function fmtDate(s?: string | null): string {
  if (!s) return 'Unknown';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtDay(s?: string | null): string {
  if (!s) return 'Unknown';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function safeHttps(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

export function invalidate(qc: QueryClient, keys: ReadonlyArray<readonly unknown[]>) {
  return Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k as unknown[] })));
}

