import { config } from '../config.js';

export class ResourceCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
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
}
