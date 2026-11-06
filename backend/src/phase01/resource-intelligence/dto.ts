import type { Resource } from './types.js';

// Preserve existing camelCase contracts; add the normalized cross-provider names.
export function resourceDTO(resource: Resource & { id?: string }) {
  const meta = resource.sourceMetadata;
  return {
    ...resource, id: resource.id ?? null,
    external_id: resource.externalId, resource_url: resource.url,
    source_api_url: resource.sourceApiUrl ?? null, last_updated: resource.sourceUpdatedAt,
    created_at: resource.sourceCreatedAt ?? null, retrieved_at: resource.retrievedAt,
    popularity_metrics: {
      stars: resource.qualitySignals.stars, forks: resource.qualitySignals.forks,
      downloads: resource.qualitySignals.downloads, likes: resource.qualitySignals.likes,
    },
    maintenance_signals: {
      archived: resource.qualitySignals.archived, last_updated: resource.sourceUpdatedAt,
      open_issues: typeof meta.openIssues === 'number' ? meta.openIssues : null,
    },
    technical_metadata: {
      ...meta, task: resource.qualitySignals.task, language: resource.language,
      library: typeof meta.library === 'string' ? meta.library : null,
      pricing: 'UNKNOWN',
    },
  };
}
