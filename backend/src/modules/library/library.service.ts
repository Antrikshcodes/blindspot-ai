import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/response.js';
import type { CreateResourceInput, ListLibraryQuery, SavedStatus } from './library.schemas.js';
import { canonicalSourceUrl } from './library.url.js';

export async function requirePrototypeProject(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId }, select: { id: true, userId: true },
  });
  if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
  // The upstream application has no identity/ownership middleware yet.
  // Never use a caller-supplied user ID or header as proof of ownership.
  if (project.userId) throw new AppError(
    'Owned projects require authenticated access, which is not implemented yet.',
    401, 'AUTHENTICATION_REQUIRED',
  );
}

export async function listResources(projectId: string, query: ListLibraryQuery) {
  const where: Prisma.LibraryResourceWhereInput = {
    projectId,
    ...(query.category && { category: query.category }),
    ...(query.saved === 'true' && { savedAt: { not: null } }),
    ...(query.saved === 'false' && { savedAt: null }),
    ...(query.status && { savedStatus: query.status, savedAt: { not: null } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.libraryResource.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.libraryResource.count({ where }),
  ]);
  return {
    items,
    pagination: {
      page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function createResource(projectId: string, input: CreateResourceInput) {
  const sourceUrl = canonicalSourceUrl(input.category, input.sourceUrl);
  try {
    return await prisma.libraryResource.create({
      data: { ...input, projectId, sourceUrl },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('This resource is already in the project Library', 409, 'DUPLICATE_RESOURCE');
    }
    throw error;
  }
}

async function requireResource(projectId: string, resourceId: string) {
  const resource = await prisma.libraryResource.findFirst({
    where: { projectId, id: resourceId },
  });
  if (!resource) throw new AppError('Library resource not found in this project', 404, 'NOT_FOUND');
  return resource;
}

export async function saveResource(projectId: string, resourceId: string, status?: SavedStatus) {
  const resource = await requireResource(projectId, resourceId);
  return prisma.libraryResource.update({
    where: { id: resource.id, projectId },
    data: {
      savedAt: resource.savedAt ?? new Date(),
      savedStatus: status ?? resource.savedStatus ?? 'CONSIDERING',
    },
  });
}

export async function updateSavedResource(projectId: string, resourceId: string, status: SavedStatus) {
  const result = await prisma.libraryResource.updateMany({
    where: { id: resourceId, projectId, savedAt: { not: null } },
    data: { savedStatus: status },
  });
  if (result.count === 0) {
    throw new AppError('Saved resource not found in this project', 404, 'NOT_FOUND');
  }
  return requireResource(projectId, resourceId);
}

export async function unsaveResource(projectId: string, resourceId: string) {
  await requireResource(projectId, resourceId);
  return prisma.libraryResource.update({
    where: { id: resourceId, projectId },
    data: { savedAt: null, savedStatus: null },
  });
}
