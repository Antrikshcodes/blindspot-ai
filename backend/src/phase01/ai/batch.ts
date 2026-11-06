/**
 * Replit AI Integrations batch utility, scoped to this standalone backend.
 * Dynamic imports preserve the existing NodeNext/CommonJS entry points.
 */
export async function batchProcess<T, R>(
  items: T[], processor: (item: T, index: number) => Promise<R>,
  options: { concurrency?: number; retries?: number; minTimeout?: number; maxTimeout?: number } = {},
): Promise<R[]> {
  const [{ default: pLimit }, { default: pRetry, AbortError }] = await Promise.all([
    import('p-limit'), import('p-retry'),
  ]);
  const limit = pLimit(options.concurrency ?? 2);
  return Promise.all(items.map((item, index) => limit(() => pRetry(async () => {
    try { return await processor(item, index); }
    catch (error) {
      if (error instanceof Error && /429|quota|rate limit/i.test(error.message)) throw error;
      throw new AbortError(error instanceof Error ? error : new Error(String(error)));
    }
  }, { retries: options.retries ?? 0, minTimeout: options.minTimeout ?? 250,
    maxTimeout: options.maxTimeout ?? 2000, factor: 2 }))));
}
