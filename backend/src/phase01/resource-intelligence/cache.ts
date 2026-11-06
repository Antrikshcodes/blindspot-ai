import { config } from '../config.js';

export class ResourceCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  private pending = new Map<string, Promise<T>>();
  constructor(private ttl = config.CACHE_TTL * 1000, private maximum = 100,
    private clock: () => number = Date.now) {}
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.clock()) { this.entries.delete(key); return undefined; }
    return entry.value;
  }
  set(key: string, value: T): void {
    if (this.entries.size >= this.maximum) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { value, expires: this.clock() + this.ttl });
  }
  async resolve(key: string, loader: () => Promise<T>, cacheable: (value: T) => boolean = () => true) {
    const existing = this.get(key);
    if (existing !== undefined) return { value: existing, cached: true };
    const running = this.pending.get(key);
    if (running) return { value: await running, cached: true };
    const work = loader();
    this.pending.set(key, work);
    try {
      const value = await work;
      if (cacheable(value)) this.set(key, value);
      return { value, cached: false };
    } finally { this.pending.delete(key); }
  }
}
