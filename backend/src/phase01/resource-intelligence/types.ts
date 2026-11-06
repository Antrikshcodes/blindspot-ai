import { z } from 'zod';
import { resourceCategory } from '../contracts.js';

export const resourceSchema = z.object({
  category: resourceCategory, provider: z.string().min(1).max(50), externalId: z.string().min(1).max(300),
  url: z.string().url().max(2048), name: z.string().min(1).max(300), description: z.string().max(5000),
  license: z.string().max(300).nullable(), language: z.string().max(100).nullable(),
  tags: z.array(z.string().max(200)).max(100),
  sourceUpdatedAt: z.date().nullable(), retrievedAt: z.date(),
  qualitySignals: z.object({
    archived: z.boolean().nullable(), documentation: z.boolean().nullable(),
    stars: z.number().nullable(), forks: z.number().nullable(), downloads: z.number().nullable(),
    likes: z.number().nullable(), sizeBytes: z.number().nullable(), task: z.string().nullable(),
  }).strict(),
  sourceMetadata: z.record(z.string(), z.unknown()),
});
export type Resource = z.infer<typeof resourceSchema>;
export type Category = Resource['category'];
export interface Provider {
  name: string;
  categories: Category[];
  enabled: boolean;
  search(query: string, languages: string[]): Promise<Resource[]>;
}
export const unknownSignals = () => ({
  archived: null, documentation: null, stars: null, forks: null,
  downloads: null, likes: null, sizeBytes: null, task: null,
});
export const dateOrNull = (value: unknown): Date | null => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
