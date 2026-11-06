import { ApiError, config } from '../config.js';

const API_HOSTS = new Set([
  'api.github.com', 'huggingface.co', 'www.kaggle.com', 'archive.ics.uci.edu', 'api.apis.guru',
  'developer.mozilla.org', 'docs.github.com', 'scikit-learn.org', 'pytorch.org',
]);
export class ProviderError extends ApiError {
  constructor(code: string, public upstreamStatus?: number, public retryAfterSeconds?: number) {
    super(502, code, 'Provider could not complete the request.');
  }
}
export class HttpClient {
  constructor(private transport: typeof fetch = fetch,
    private settings: { timeoutMs?: number; sleep?: (ms: number) => Promise<void> } = {}) {}
  async request(url: string, headers: Record<string, string> = {}, method = 'GET', maxBytes = 2_000_000): Promise<string> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !API_HOSTS.has(parsed.hostname)
      || parsed.username || parsed.password || parsed.port) {
      throw new ApiError(502, 'UNSAFE_PROVIDER_URL', 'Provider destination was rejected.');
    }
    // Only the official aggregate directory needs a larger, still bounded body.
    const maximum = parsed.hostname === 'api.apis.guru' ? Math.min(maxBytes, 16_000_000) : 2_000_000;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          (async () => {
            const response = await this.transport(url, {
              method, headers: { 'User-Agent': 'BlindspotAI/phase03', ...headers },
              signal: controller.signal, redirect: 'error',
            });
            if (!response.ok) {
              await response.body?.cancel();
              const retryHeader = response.headers.get('retry-after');
              const reset = Number(response.headers.get('x-ratelimit-reset'));
              const retryAfter = retryHeader
                ? (/^\d+$/.test(retryHeader) ? Number(retryHeader) : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000))
                : reset ? Math.ceil(reset - Date.now() / 1000) : undefined;
              const limited = response.status === 429
                || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0');
              throw new ProviderError(limited ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_HTTP_ERROR',
                response.status, retryAfter && retryAfter > 0 ? retryAfter : undefined);
            }
            const reader = response.body?.getReader();
            if (!reader) return '';
            const chunks: Uint8Array[] = []; let size = 0;
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              size += value.length;
              if (size > maximum) {
                await reader.cancel();
                throw new ApiError(502, 'PROVIDER_RESPONSE_TOO_LARGE', 'Provider response exceeded the safe limit.');
              }
              chunks.push(value);
            }
            return Buffer.concat(chunks).toString('utf8');
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new ProviderError('PROVIDER_TIMEOUT'));
              controller.abort();
            }, this.settings.timeoutMs ?? config.EXTERNAL_TIMEOUT_MS);
          }),
        ]);
      } catch (error) {
        const retryable = !(error instanceof ApiError) || (error instanceof ProviderError
          && (error.code === 'PROVIDER_TIMEOUT' || error.upstreamStatus === 429
            || (error.upstreamStatus ?? 0) >= 500));
        if (!retryable || attempt === 1 || (error instanceof ProviderError && (error.retryAfterSeconds ?? 0) > 2)) {
          if (error instanceof ApiError) throw error;
          throw new ProviderError('PROVIDER_UNAVAILABLE');
        }
        // Respect small Retry-After delays; report long ones rather than sleeping
        // indefinitely or immediately hammering a rate-limited endpoint.
        const delay = error instanceof ProviderError && error.retryAfterSeconds
          ? error.retryAfterSeconds * 1000 : 200 * 2 ** attempt;
        if (timer) clearTimeout(timer);
        await (this.settings.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms))))(delay);
      } finally { if (timer) clearTimeout(timer); }
    }
    throw new ProviderError('PROVIDER_UNAVAILABLE');
  }
  async json(url: string, headers?: Record<string, string>, maxBytes?: number): Promise<unknown> {
    try { return JSON.parse(await this.request(url, headers, 'GET', maxBytes)); }
    catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'PROVIDER_INVALID_JSON', 'Provider returned invalid JSON.');
    }
  }
}
