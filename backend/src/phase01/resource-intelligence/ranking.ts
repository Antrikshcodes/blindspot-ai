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
  functional: z.number().min(0).max(1).default(0),
  integrationEase: z.number().min(0).max(1).default(0),
}).strict().refine(weights => Object.values(weights).reduce((a, b) => a + b, 0) > 0);
export const defaultWeights = {
  relevance: 0.4, compatibility: 0.15, documentation: 0.1,
  maintenance: 0.08, licenseAvailability: 0.02, maturity: 0,
  functional: 0.2, integrationEase: 0.05,
};
export const configuredWeights = weightsSchema.parse(
  config.RANK_WEIGHTS ? JSON.parse(config.RANK_WEIGHTS) : defaultWeights,
);
const stopwords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'users', 'platform', 'powered', 'product']);
export function terms(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9+#]{2,}/g) ?? [])]
    .filter(word => !stopwords.has(word)).slice(0, 20);
}
export function matchesTerm(content: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9+#])${escaped}(?:$|[^a-z0-9+#])`, 'i').test(content);
}
const concepts = [
  ['misinformation', 'fake news', 'fake-news', 'news credibility', 'disinformation'],
  ['text classification', 'text-classification', 'nlp classification', 'text classifier'],
  ['embedding', 'semantic similarity', 'feature-extraction', 'sentence similarity', 'vector search'],
  ['speech recognition', 'automatic-speech-recognition', 'transcription', 'speech-to-text'],
  ['image classification', 'image-classification', 'image recognition'],
  ['fact check', 'fact-check', 'factcheck', 'source verification'],
  ['validation', 'interview', 'customer discovery'],
];
export function rankResource(resource: Resource, query: string, languages: string[] = [],
  weights = configuredWeights, now = Date.now(), tasks: string[] = []) {
  const checkedWeights = weightsSchema.parse(weights);
  const tokens = terms(query);
  const content = `${resource.name} ${resource.description} ${resource.tags.join(' ')}`.toLowerCase();
  const matchedTerms = tokens.filter(token => matchesTerm(content, token));
  const lexical = Math.round(100 * matchedTerms.length / Math.max(tokens.length, 1));
  const requestedConcepts = concepts.filter(group => group.some(word => query.toLowerCase().includes(word)));
  const semantic = requestedConcepts.length
    ? Math.round(100 * requestedConcepts.filter(group => group.some(word => content.includes(word))).length / requestedConcepts.length)
    : lexical;
  const relevanceScore = Math.round(0.6 * lexical + 0.4 * semantic);
  const taskKnown = resource.category === 'AI_MODEL' && tasks.length > 0 && resource.qualitySignals.task;
  const taskCompatible = taskKnown ? tasks.includes(resource.qualitySignals.task!) : null;
  const age = resource.sourceUpdatedAt ? Math.max(0, now - resource.sourceUpdatedAt.getTime()) / 86400000 : null;
  const components = {
    relevance: relevanceScore,
    compatibility: taskKnown ? (taskCompatible ? 100 : 0) : languages.length && resource.language
      ? (languages.some(language => language.toLowerCase() === resource.language!.toLowerCase()) ? 100 : 0) : null,
    documentation: resource.qualitySignals.documentation === null ? null : resource.qualitySignals.documentation ? 100 : 0,
    maintenance: age === null ? null : age <= 180 ? 100 : age <= 730 ? 50 : 0,
    licenseAvailability: resource.license ? 100 : null,
    // Popularity remains source metadata, never a quality/ranking input.
    maturity: null,
    functional: taskKnown ? (taskCompatible ? 100 : 0) : relevanceScore,
    integrationEase: null,
  };
  const totalWeight = Object.values(checkedWeights).reduce((a, b) => a + b, 0);
  const rankScore = Math.round(
    Object.entries(checkedWeights).reduce((score, [key, weight]) =>
      score + weight * (components[key as keyof typeof components] ?? 0), 0)
      / totalWeight * (resource.qualitySignals.archived ? 0.5 : 1),
  );
  const qualityKeys = ['documentation', 'maintenance', 'licenseAvailability'] as const;
  const qualityScore = Math.round(qualityKeys.reduce((sum, key) => sum + (components[key] ?? 0), 0) / qualityKeys.length);
  return {
    relevanceScore, rankScore, qualityScore,
    ranking: { components, weights: checkedWeights, matchedTerms,
      semanticMethod: 'Transparent curated concept overlap plus lexical coverage; not embeddings or calibrated similarity.',
      lexicalScore: lexical, semanticScore: semantic,
      explanation: `${matchedTerms.length}/${tokens.length} query terms match retrieved metadata. Missing signals contribute zero; popularity is not scored.`,
      technicalCompatibility: taskKnown ? (taskCompatible ? 'COMPATIBLE' : 'INCOMPATIBLE')
        : components.compatibility === null ? 'UNKNOWN' : components.compatibility === 100 ? 'COMPATIBLE' : 'INCOMPATIBLE',
      maintenanceStatus: resource.qualitySignals.archived ? 'ARCHIVED'
        : age === null ? 'UNKNOWN' : age <= 180 ? 'RECENT_METADATA' : age <= 730 ? 'OLDER_METADATA' : 'STALE_METADATA',
      licenseStatus: resource.license ? 'KNOWN_UNREVIEWED' : 'UNKNOWN',
      documentationStatus: resource.qualitySignals.documentation === null ? 'UNKNOWN'
        : resource.qualitySignals.documentation ? 'PRESENT' : 'NOT_REPORTED',
      confidence: relevanceScore >= 80 && Object.values(components).filter(value => value !== null).length >= 4 ? 'HIGH'
        : relevanceScore >= 40 ? 'MEDIUM' : relevanceScore > 0 ? 'LOW' : 'UNKNOWN',
      qualityScoreMeaning: 'Legacy metadata-signal score, not a security audit or measured software quality.',
      unknownSignals: Object.keys(components).filter(key => components[key as keyof typeof components] === null),
      archivedPenalty: resource.qualitySignals.archived === true,
      licenseCompatibility: 'UNKNOWN', integrationDifficulty: 'UNKNOWN',
      disclaimer: 'Relevance and metadata signals do not establish security, quality, reliability or license compatibility.' },
  };
}
