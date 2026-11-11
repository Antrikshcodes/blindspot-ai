import type { SavedResource } from '@workspace/api-client-react';
import { ResourceFixture, resourceId, resourceProjectId } from './resource-fixture';

// Synthetic association fixtures only. Production code never imports this file.
export const libraryDate = '2026-11-10T12:00:00.000Z';
export const secondLibraryProject = resourceId(2);
export const associationKey = (projectId: string, id: string) => `${projectId}/${id}`;
export function savedResource(n: number, projectId = resourceProjectId, status = 'CONSIDERING'): SavedResource {
  return { id: resourceId(800 + n), projectId, resourceId: resourceId(n), status, createdAt: libraryDate, updatedAt: libraryDate };
}
const response = (data: unknown, status = 200) => new Response(JSON.stringify(
  status < 400 ? { success: true, data } : { success: false, error: data },
), { status, headers: { 'Content-Type': 'application/json' } });

export class LibraryFixture extends ResourceFixture {
  private baseFetch: ResourceFixture['fetch'];
  constructor() {
    super();
    this.baseFetch = this.fetch;
    this.fetch = this.libraryFetch;
  }
  associations = new Map<string, SavedResource>([
    [associationKey(resourceProjectId, resourceId(10)), savedResource(10)],
    [associationKey(resourceProjectId, resourceId(12)), savedResource(12, resourceProjectId, 'TRYING')],
  ]);
  ownedProjects = new Set([resourceProjectId]);
  failSave = false;
  failRemove = false;
  failSavedRead = false;
  falseRemoval = false;
  loseSaveResponse = false;
  saveGate: Promise<void> | null = null;
  removeGate: Promise<void> | null = null;
  collectionReadGate: Promise<void> | null = null;
  private libraryFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://fixture.invalid');
    const path = url.pathname;
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
    const listMatch = path.match(/^\/api\/projects\/([^/]+)\/resources(\/saved)?$/);
    const saveMatch = path.match(/^\/api\/resources\/([^/]+)\/save$/);
    const removeMatch = path.match(/^\/api\/projects\/([^/]+)\/resources\/([^/]+)\/save$/);
    const secondProject = path === `/api/projects/${secondLibraryProject}`;
    if (!listMatch && !saveMatch && !removeMatch && !secondProject) return this.baseFetch(input, init);
    this.calls.push({ method, path, body, params: url.searchParams });
    const fail = (status: number, code: string, message: string) => response({ code, message }, status);
    if (this.access) return fail(this.access, 'AUTH_NOT_READY', 'Private project access is unavailable.');
    if (secondProject) return this.ownedProjects.has(secondLibraryProject)
      ? response({ id: secondLibraryProject, name: 'TEST ONLY second project', createdAt: libraryDate })
      : fail(404, 'NOT_FOUND', 'Project not found.');
    const projectId = listMatch?.[1] ?? removeMatch?.[1] ?? String(body?.projectId ?? '');
    if (!this.ownedProjects.has(projectId)) return fail(404, 'NOT_FOUND', 'Project not found.');
    if (listMatch && method === 'GET') {
      const savedOnly = !!listMatch[2];
      if (!savedOnly && this.collectionReadGate) await this.collectionReadGate;
      if (savedOnly ? this.failSavedRead : this.failList) return fail(503, 'UNAVAILABLE', 'Saved resources could not be loaded.');
      const category = url.searchParams.get('category');
      const provider = url.searchParams.get('provider');
      const page = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const all = savedOnly
        ? [...this.associations.values()].filter((saved) => saved.projectId === projectId).map((saved) => {
          const resource = this.resources.find((r) => r.id === saved.resourceId)!;
          const candidate = this.items.find((item) => item.resourceId === resource.id);
          return { resource, saved, relevanceScore: candidate?.relevanceScore ?? null, rankScore: candidate?.rankScore ?? null };
        })
        : this.items.map(({ resource, ...recommendation }) => ({ resource, recommendation, saved: this.associations.get(associationKey(projectId, resource.id)) ?? null }));
      const filtered = all.filter((item) => (!category || item.resource.category === category) &&
        (!provider || item.resource.provider === provider));
      return response({ items: filtered.slice((page - 1) * limit, page * limit), pagination: { page, limit } });
    }
    if (saveMatch && method === 'POST') {
      if (this.saveGate) await this.saveGate;
      if (this.failSave) return fail(500, 'INTERNAL_ERROR', 'Could not save this resource.');
      const id = saveMatch[1];
      if (!this.resources.some((resource) => resource.id === id)) return fail(404, 'NOT_FOUND', 'Resource was not retrieved for this project.');
      if (Object.keys(body ?? {}).some((key) => !['projectId', 'status'].includes(key))) return fail(400, 'VALIDATION_ERROR', 'Unknown save field.');
      if (body?.status && !['CONSIDERING', 'TRYING', 'INTEGRATED'].includes(String(body.status))) return fail(400, 'VALIDATION_ERROR', 'Invalid saved status.');
      const key = associationKey(projectId, id);
      const existing = this.associations.get(key);
      const saved: SavedResource = {
        id: existing?.id ?? resourceId(900 + this.associations.size), projectId, resourceId: id,
        status: String(body?.status ?? existing?.status ?? 'CONSIDERING'),
        createdAt: existing?.createdAt ?? libraryDate, updatedAt: '2026-11-11T12:00:00.000Z',
      };
      this.associations.set(key, saved);
      if (this.loseSaveResponse) throw new TypeError('Save response was lost after the server committed.');
      return response(saved);
    }
    if (removeMatch && method === 'DELETE') {
      if (this.removeGate) await this.removeGate;
      if (this.failRemove) return fail(500, 'INTERNAL_ERROR', 'Could not remove this saved association.');
      if (this.falseRemoval) return response({ removedFromSaved: false });
      this.associations.delete(associationKey(projectId, removeMatch[2]));
      return response({ removedFromSaved: true });
    }
    throw new Error(`Unexpected library request: ${method} ${path}`);
  };
}
