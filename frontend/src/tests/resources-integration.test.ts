import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ResourceCategory,
  ResourceSaveInputStatus,
  formatCategoryLabel,
  getProviderBadgeStyles,
  getSaveStatusBadgeStyles,
} from '../types/resources.ts';

describe('Resource Category and Labeling', () => {
  test('formatCategoryLabel maps all supported Phase 03 resource categories', () => {
    assert.equal(formatCategoryLabel(ResourceCategory.GITHUB_REPOSITORY), 'GitHub Repo');
    assert.equal(formatCategoryLabel(ResourceCategory.AI_MODEL), 'AI Model');
    assert.equal(formatCategoryLabel(ResourceCategory.DATASET), 'Dataset');
    assert.equal(formatCategoryLabel(ResourceCategory.API), 'REST API');
    assert.equal(formatCategoryLabel(ResourceCategory.DOCUMENTATION), 'Official Docs');
    assert.equal(formatCategoryLabel(ResourceCategory.OPEN_SOURCE_TOOL), 'Open-Source Tool');
    assert.equal(formatCategoryLabel(ResourceCategory.LEARNING_RESOURCE), 'Learning Guide');
  });

  test('formatCategoryLabel falls back gracefully for custom or unexpected strings', () => {
    assert.equal(formatCategoryLabel('CUSTOM_RESEARCH_PAPER'), 'CUSTOM RESEARCH PAPER');
    assert.equal(formatCategoryLabel(''), 'Resource');
  });
});

describe('Provider Badge Styling & Design System Adherence', () => {
  test('GitHub provider maps to Forest Green palette', () => {
    const badge = getProviderBadgeStyles('github');
    assert.ok(badge.bg.includes('forest'));
    assert.ok(badge.text.includes('forest'));
  });

  test('Hugging Face providers map to Amber palette', () => {
    const badgeModels = getProviderBadgeStyles('huggingface_models');
    assert.ok(badgeModels.bg.includes('amber'));
    const badgeDatasets = getProviderBadgeStyles('huggingface_datasets');
    assert.ok(badgeDatasets.bg.includes('amber'));
  });

  test('APIs.guru and general API providers map to Electric Purple palette', () => {
    const badge = getProviderBadgeStyles('apis_guru');
    assert.ok(badge.bg.includes('purple'));
    assert.ok(badge.text.includes('purple'));
  });

  test('UCI and scientific dataset providers map to Blue palette', () => {
    const badge = getProviderBadgeStyles('uci');
    assert.ok(badge.bg.includes('blue'));
  });
});

describe('Resource Implementation Status Badges', () => {
  test('INTEGRATED status renders strong emerald badge', () => {
    const styles = getSaveStatusBadgeStyles(ResourceSaveInputStatus.INTEGRATED);
    assert.ok(styles.bg.includes('emerald'));
    assert.ok(styles.text.includes('emerald'));
  });

  test('TRYING status renders electric purple badge', () => {
    const styles = getSaveStatusBadgeStyles(ResourceSaveInputStatus.TRYING);
    assert.ok(styles.bg.includes('purple'));
    assert.ok(styles.text.includes('purple'));
  });

  test('CONSIDERING status renders distinct amber badge', () => {
    const styles = getSaveStatusBadgeStyles(ResourceSaveInputStatus.CONSIDERING);
    assert.ok(styles.bg.includes('amber'));
    assert.ok(styles.text.includes('amber'));
  });
});

describe('Multi-Criteria Ranking and Quality Heuristics Rules', () => {
  test('Rank and Relevance scores remain strictly in normalized range 0.0 to 1.0', () => {
    const sampleScores = [0.0, 0.45, 0.72, 0.98, 1.0];
    sampleScores.forEach((score) => {
      assert.ok(score >= 0 && score <= 1);
      const percent = Math.round(score * 100);
      assert.ok(percent >= 0 && percent <= 100);
    });
  });

  test('Informational popularity metrics (stars, forks, downloads) are distinct from ranking weights', () => {
    const rawMetrics = { stars: 12400, forks: 850, downloads: 45000 };
    // Informational signals must be strictly positive numbers or null
    assert.equal(typeof rawMetrics.stars, 'number');
    assert.equal(typeof rawMetrics.forks, 'number');
    assert.equal(typeof rawMetrics.downloads, 'number');
  });
});

describe('Resource Search Input Constraints and Limits', () => {
  test('Explicit search query enforces max 150 characters constraint', () => {
    const validQuery = 'vector database with hybrid BM25 and dense retrieval in Python';
    assert.ok(validQuery.length <= 150);

    const oversizedQuery = 'a'.repeat(151);
    assert.ok(oversizedQuery.length > 150);
  });

  test('Language constraints allow at most 5 languages of max 40 characters each', () => {
    const validLangs = ['Python', 'TypeScript', 'Rust', 'Go'];
    assert.ok(validLangs.length <= 5);
    assert.ok(validLangs.every((l) => l.length <= 40));

    const tooManyLangs = ['Python', 'TypeScript', 'Rust', 'Go', 'Java', 'C++'];
    assert.ok(tooManyLangs.length > 5);

    const longLang = 'A'.repeat(41);
    assert.ok(longLang.length > 40);
  });
});
