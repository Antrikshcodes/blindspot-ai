import { ApiError, config } from '../config.js';

const API_HOSTS = new Set([
  'api.github.com', 'huggingface.co', 'www.kaggle.com', 'archive.ics.uci.edu',
  'developer.mozilla.org', 'docs.github.com', 'scikit-learn.org', 'pytorch.org',
]);
export class HttpClient {
  constructor(private transport: typeof fetch = fetch) {}
  async request(url: string, headers: Record<string, string> = {}, method = 'GET'): Promise<string> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !API_HOSTS.has(parsed.hostname)
      || parsed.username || parsed.password || parsed.port) {
      throw new ApiError(502, 'UNSAFE_PROVIDER_URL', 'Provider destination was rejected.');
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.transport(url, {
          method, headers: { 'User-Agent': 'BlindspotAI/phase01', ...headers },
          signal: AbortSignal.timeout(config.EXTERNAL_TIMEOUT_MS), redirect: 'error',
        });
        if (!response.ok) {
          await response.body?.cancel();
          if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
          throw new ApiError(502, 'PROVIDER_HTTP_ERROR', `Provider returned HTTP ${response.status}.`);
        }
        const reader = response.body?.getReader();
        if (!reader) return '';
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2_000_000) {
            await reader.cancel();
            throw new ApiError(502, 'PROVIDER_RESPONSE_TOO_LARGE', 'Provider response exceeded the safe limit.');
          }
          chunks.push(value);
        }
        return Buffer.concat(chunks).toString('utf8');
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (attempt === 1) throw new ApiError(502, 'PROVIDER_UNAVAILABLE', 'Provider timed out or could not be reached.');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    throw new ApiError(502, 'PROVIDER_UNAVAILABLE', 'Provider unavailable.');
  }
  async json(url: string, headers?: Record<string, string>): Promise<unknown> {
    try { return JSON.parse(await this.request(url, headers)); }
    catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'PROVIDER_INVALID_JSON', 'Provider returned invalid JSON.');
    }
  }
}
