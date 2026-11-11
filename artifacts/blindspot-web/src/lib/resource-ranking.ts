/** Presentation of returned server metadata only; never calculates or sorts rank. */
const factorLabels = {
  relevance: 'Relevance',
  compatibility: 'Technical compatibility',
  documentation: 'Documentation',
  maintenance: 'Maintenance metadata',
  licenseAvailability: 'License availability',
  maturity: 'Legacy maturity signal',
  functional: 'Functional fit',
  integrationEase: 'Integration ease',
} as const;
const noteKeys = [
  'explanation', 'semanticMethod', 'qualityScoreMeaning', 'disclaimer',
  'technicalCompatibility', 'maintenanceStatus', 'licenseStatus',
  'documentationStatus', 'confidence', 'licenseCompatibility', 'integrationDifficulty',
] as const;
export const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const actualText = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v : null;
export const backendScore = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
const texts = (v: unknown): string[] => Array.isArray(v)
  ? v.filter((item): item is string => typeof item === 'string' && !!item.trim()) : [];

export function readRanking(value: unknown) {
  const raw = record(value);
  const components = record(raw.components);
  const weights = record(raw.weights);
  const factors = Object.entries(factorLabels).filter(([key]) =>
    Object.hasOwn(components, key) || Object.hasOwn(weights, key),
  ).map(([key, label]) => ({
    key, label, value: backendScore(components[key]),
    weight: typeof weights[key] === 'number' && Number.isFinite(weights[key]) &&
      (weights[key] as number) >= 0 && (weights[key] as number) <= 1 ? weights[key] as number : null,
  }));
  const notes = Object.fromEntries(noteKeys.map((key) => [key, actualText(raw[key])])) as Record<typeof noteKeys[number], string | null>;
  return {
    factors, notes,
    documentedRank: factors.some((factor) => factor.weight !== null && factor.weight > 0) &&
      Object.keys(components).length > 0,
    matchedTerms: texts(raw.matchedTerms), unknownSignals: texts(raw.unknownSignals),
    lexicalScore: backendScore(raw.lexicalScore), semanticScore: backendScore(raw.semanticScore),
    archivedPenalty: typeof raw.archivedPenalty === 'boolean' ? raw.archivedPenalty : null,
  };
}
