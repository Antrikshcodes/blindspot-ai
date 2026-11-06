import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { canonicalSourceUrl } from '../src/modules/library/library.url.js';

const resource = {
  category: 'GITHUB_REPOSITORY',
  sourceUrl: 'https://github.com/Example/Useful-Repo.git?utm_source=test#readme',
  name: 'Example resource',
  description: 'A fixture used only by automated tests, not a recommendation.',
  relevanceExplanation: 'Supports a prototype experiment for this idea.',
  useCase: 'Build a small proof of concept.',
};

let projectId: string;
let otherProjectId: string;
let ownedProjectId: string;
let ownerId: string;
const library = (id = projectId) => `/api/v1/projects/${id}/library`;
const saved = (id: string, project = projectId) => `${library(project)}/resources/${id}/save`;

beforeAll(async () => {
  const data = { name: 'Library test idea', problemStatement: 'Fixture problem', targetAudience: 'Testers' };
  projectId = (await prisma.project.create({ data })).id;
  otherProjectId = (await prisma.project.create({ data })).id;
  ownerId = (await prisma.user.create({ data: { email: 'library-tests@example.invalid' } })).id;
  ownedProjectId = (await prisma.project.create({ data: { ...data, userId: ownerId } })).id;
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { id: { in: [projectId, otherProjectId, ownedProjectId] } } });
  await prisma.user.deleteMany({ where: { id: ownerId } });
  await prisma.$disconnect();
});

describe('Library source normalization', () => {
  it('deduplicates GitHub repository variants without claiming existence', () => {
    expect(canonicalSourceUrl('GITHUB_REPOSITORY', resource.sourceUrl))
      .toBe('https://github.com/example/useful-repo');
  });

  it('normalizes supported dataset links', () => {
    expect(canonicalSourceUrl('DATASET', 'https://huggingface.co/datasets/example/fixture/?utm_source=x'))
      .toBe('https://huggingface.co/datasets/example/fixture');
    expect(canonicalSourceUrl('DATASET', 'https://www.kaggle.com/datasets/example/fixture'))
      .toBe('https://www.kaggle.com/datasets/example/fixture');
    expect(canonicalSourceUrl('DATASET', 'https://catalog.data.gov/dataset/fixture'))
      .toBe('https://catalog.data.gov/dataset/fixture');
  });

  it.each([
    'http://github.com/example/repo',
    'https://github.com.evil.example/example/repo',
    'https://user:password@github.com/example/repo',
    'https://github.com:8443/example/repo',
    'https://github.com/example/repo/tree/main',
    'https://github.com/example',
    'javascript:alert(1)',
    'https://localhost/example/repo',
  ])('rejects unsafe or unsupported repository URL %s', (url) => {
    expect(() => canonicalSourceUrl('GITHUB_REPOSITORY', url)).toThrow();
  });

  it('rejects mismatched resource category and dataset lookalikes', () => {
    expect(() => canonicalSourceUrl('DATASET', 'https://github.com/example/repo')).toThrow();
    expect(() => canonicalSourceUrl('DATASET', 'https://huggingface.co.evil.example/datasets/x')).toThrow();
  });
});

describe('Library API', () => {
  it('returns a genuine empty state and rejects nonexistent projects', async () => {
    const empty = await request(app).get(library());
    expect(empty.status).toBe(200);
    expect(empty.body.data.items).toEqual([]);
    expect(empty.body.data.pagination.total).toBe(0);
    expect(empty.headers['cache-control']).toBe('no-store');
    const missing = await request(app).get(library('missing-project'));
    expect(missing.status).toBe(404);
  });

  it('adds curated metadata, preserves unknowns, and rejects duplicates', async () => {
    const created = await request(app).post(`${library()}/resources`).send(resource);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      projectId, sourceUrl: 'https://github.com/example/useful-repo',
      license: null, usageNotes: null, metadataProvenance: 'CURATED_UNVERIFIED',
      integrationDifficulty: 'UNKNOWN', savedAt: null, savedStatus: null,
    });
    const duplicate = await request(app).post(`${library()}/resources`)
      .send({ ...resource, sourceUrl: 'https://github.com/example/useful-repo/' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_RESOURCE');
  });

  it('supports per-idea resources, categories, pagination, and strict query validation', async () => {
    const dataset = await request(app).post(`${library()}/resources`).send({
      ...resource, category: 'DATASET', sourceUrl: 'https://huggingface.co/datasets/example/fixture',
    });
    expect(dataset.status).toBe(201);
    const sameLinkOtherIdea = await request(app).post(`${library(otherProjectId)}/resources`).send(resource);
    expect(sameLinkOtherIdea.status).toBe(201);
    const filtered = await request(app).get(`${library()}?category=DATASET&limit=1&page=1`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.items).toHaveLength(1);
    expect(filtered.body.data.items[0].category).toBe('DATASET');
    expect(filtered.body.data.pagination.total).toBe(1);
    const page = await request(app).get(`${library()}?limit=1&page=2`);
    expect(page.body.data.items).toHaveLength(1);
    expect(page.body.data.pagination.total).toBe(2);
    for (const query of ['limit=101', 'page=0', 'saved=maybe', 'status=UNKNOWN', 'category=API', 'saved=false&status=TRYING']) {
      expect((await request(app).get(`${library()}?${query}`)).status).toBe(400);
    }
  });

  it('saves idempotently, updates status, filters saved items, and unsaves without deleting recommendations', async () => {
    const list = await request(app).get(`${library()}?category=GITHUB_REPOSITORY`);
    const id = list.body.data.items[0].id;
    const first = await request(app).put(saved(id)).send({});
    expect(first.status).toBe(200);
    expect(first.body.data.savedStatus).toBe('CONSIDERING');
    const again = await request(app).put(saved(id)).send({});
    expect(again.body.data.savedAt).toBe(first.body.data.savedAt);
    const changed = await request(app).patch(saved(id)).send({ status: 'TRYING' });
    expect(changed.status).toBe(200);
    const repeated = await request(app).put(saved(id)).send({});
    expect(repeated.body.data.savedStatus).toBe('TRYING');
    const filtered = await request(app).get(`${library()}?saved=true&status=TRYING`);
    expect(filtered.body.data.items).toHaveLength(1);
    expect(filtered.body.data.items[0].id).toBe(id);
    expect((await request(app).patch(saved(id)).send({ status: 'INTEGRATED' })).status).toBe(200);
    const removed = await request(app).delete(saved(id));
    expect(removed.body.data.savedAt).toBeNull();
    expect(removed.body.data.savedStatus).toBeNull();
    expect((await request(app).delete(saved(id))).status).toBe(200);
    expect((await request(app).get(`${library()}?saved=true`)).body.data.items).toEqual([]);
    expect((await request(app).get(library())).body.data.pagination.total).toBe(2);
    expect((await request(app).patch(saved(id)).send({ status: 'TRYING' })).status).toBe(404);
  });

  it('does not let another project save, update, or unsave a resource', async () => {
    const id = (await request(app).get(library())).body.data.items[0].id;
    expect((await request(app).put(saved(id, otherProjectId)).send({})).status).toBe(404);
    expect((await request(app).patch(saved(id, otherProjectId)).send({ status: 'TRYING' })).status).toBe(404);
    expect((await request(app).delete(saved(id, otherProjectId))).status).toBe(404);
  });

  it('rejects invalid payloads and server-owned field injection', async () => {
    for (const input of [
      { ...resource, name: ' ' }, { ...resource, sourceUrl: 'http://github.com/example/repo' },
      { ...resource, category: 'API' }, { ...resource, savedStatus: 'INTEGRATED' },
      { ...resource, metadataProvenance: 'VERIFIED' }, { ...resource, projectId: otherProjectId },
      { ...resource, integrationDifficulty: 'TRIVIAL' }, { ...resource, description: 'x'.repeat(2001) },
    ]) {
      expect((await request(app).post(`${library()}/resources`).send(input)).status).toBe(400);
    }
    const malformed = await request(app).post(`${library()}/resources`)
      .set('Content-Type', 'application/json').send('{ invalid }');
    expect(malformed.status).toBe(400);
    const id = (await request(app).get(library())).body.data.items[0].id;
    expect((await request(app).patch(saved(id)).send({ status: 'INVALID' })).status).toBe(400);
  });

  it('fails closed for owned projects, including spoofed identity headers', async () => {
    const denied = await request(app).get(library(ownedProjectId)).set('X-User-Id', ownerId);
    expect(denied.status).toBe(401);
    expect(denied.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('fails closed in production for every Library operation', async () => {
    const previous = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const responses = await Promise.all([
        request(app).get(library()),
        request(app).post(`${library()}/resources`).send(resource),
        request(app).put(saved('missing')).send({}),
        request(app).patch(saved('missing')).send({ status: 'TRYING' }),
        request(app).delete(saved('missing')),
      ]);
      for (const response of responses) {
        expect(response.status).toBe(503);
        expect(response.body.error.code).toBe('LIBRARY_AUTH_NOT_READY');
      }
    } finally {
      env.NODE_ENV = previous;
    }
  });
});
