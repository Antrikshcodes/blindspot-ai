import { z } from 'zod';

export const resourceCategory = z.enum(['GITHUB_REPOSITORY', 'DATASET']);
export const savedStatus = z.enum(['CONSIDERING', 'TRYING', 'INTEGRATED']);
export const integrationDifficulty = z.enum(['EASY', 'MODERATE', 'ADVANCED', 'UNKNOWN']);

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => text(max).nullable().optional();

export const projectParams = z.object({ projectId: text(128) }).strict();
export const resourceParams = projectParams.extend({ resourceId: text(128) });

export const listLibraryQuery = z.object({
  category: resourceCategory.optional(),
  saved: z.enum(['true', 'false']).optional(),
  status: savedStatus.optional(),
  page: z.string().regex(/^[1-9]\d*$/).default('1')
    .transform(Number).pipe(z.number().int().max(10000)),
  limit: z.string().regex(/^[1-9]\d*$/).default('20')
    .transform(Number).pipe(z.number().int().max(100)),
}).strict().refine((query) => !(query.saved === 'false' && query.status), {
  message: 'A saved status cannot be combined with saved=false',
  path: ['status'],
});

export const createResourceBody = z.object({
  category: resourceCategory,
  sourceUrl: text(2048).url(),
  name: text(200),
  description: text(2000),
  license: optionalText(200),
  usageNotes: optionalText(2000),
  relevanceExplanation: text(2000),
  useCase: text(1000),
  integrationDifficulty: integrationDifficulty.default('UNKNOWN'),
  limitations: optionalText(2000),
}).strict();

export const saveResourceBody = z.object({
  status: savedStatus.optional(),
}).strict();

export const updateSavedResourceBody = z.object({
  status: savedStatus,
}).strict();

export type CreateResourceInput = z.infer<typeof createResourceBody>;
export type ListLibraryQuery = z.infer<typeof listLibraryQuery>;
export type SavedStatus = z.infer<typeof savedStatus>;
