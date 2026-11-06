import { z } from 'zod';
import { config } from '../config.js';
import type { Resource } from './types.js';

const weightsSchema = z.object({
  relevance: z.number().min(0).max(1),
  compatibility: z.number().min(0).max(1),
  documentation: z.number().min(0).max(1),
  maintenance: z.number().min(0).max(1),
  licenseAvailability: z.number().min(0).max(1),
  maturity: z.number().min(0).max(1),
}).strict().refine(weights => Object.values(weights).reduce((a, b) => a + b, 0) > 0);
export const defaultWeights = {
  relevance: 0.65, compatibility: 0.1, documentation: 0.08,
  maintenance: 0.08, licenseAvailability: 0.04, maturity: 0.05,
};
export const configuredWeights = weightsSchema.parse(
  config.RANK_WEIGHTS ? JSON.parse(config.RANK_WEIGHTS) : defaultWeights,
);
const stopwords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'users', 'platform', 'powered', 'product']);
export function terms(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9+#]{2,}/g) ?? [])]
    .filter(word => !stopwords.has(word)).slice(0, 20);
}
export function rankResource(resource: Resource, query: string, languages: string[] = [],
  weights = configuredWeights, now = Date.now()) {
  const checkedWeights = weightsSchema.parse(weights);
  const tokens = terms(query);
  const content = `${resource.name} ${resource.description} ${resource.tags.join(' ')}`.toLowerCase();
  const matchedTerms = tokens.filter(token => content.includes(token));
  const relevanceScore = Math.round(100 * matchedTerms.length / Math.max(tokens.length, 1));
  const age = resource.sourceUpdatedAt ? Math.max(0, now - resource.sourceUpdatedAt.getTime()) / 86400000 : null;
  const components = {
    relevance: relevanceScore,
    compatibility: languages.length && resource.language
      ? (languages.some(language => language.toLowerCase() === resource.language!.toLowerCase()) ? 100 : 0) : null,
    documentation: resource.qualitySignals.documentation === null ? null : resource.qualitySignals.documentation ? 100 : 0,
    maintenance: age === null ? null : age <= 180 ? 100 : age <= 730 ? 50 : 0,
    licenseAvailability: resource.license ? 100 : null,
    maturity: resource.qualitySignals.stars !== null
      ? Math.min(100, Math.round(Math.log10(resource.qualitySignals.stars + 1) * 20))
      : resource.qualitySignals.downloads !== null
        ? Math.min(100, Math.round(Math.log10(resource.qualitySignals.downloads + 1) * 15)) : null,
  };
  const totalWeight = Object.values(checkedWeights).reduce((a, b) => a + b, 0);
  const rankScore = Math.round(
    Object.entries(checkedWeights).reduce((score, [key, weight]) =>
      score + weight * (components[key as keyof typeof components] ?? 0), 0)
      / totalWeight * (resource.qualitySignals.archived ? 0.5 : 1),
  );
  const qualityKeys = ['documentation', 'maintenance', 'licenseAvailability', 'maturity'] as const;
  const qualityScore = Math.round(qualityKeys.reduce((sum, key) => sum + (components[key] ?? 0), 0) / qualityKeys.length);
  return {
    relevanceScore, rankScore, qualityScore,
    ranking: { components, weights: checkedWeights, matchedTerms,
      unknownSignals: Object.keys(components).filter(key => components[key as keyof typeof components] === null),
      archivedPenalty: resource.qualitySignals.archived === true,
      licenseCompatibility: 'UNKNOWN', integrationDifficulty: 'UNKNOWN',
      disclaimer: 'Relevance and metadata signals do not establish security, quality, reliability or license compatibility.' },
  };
}
