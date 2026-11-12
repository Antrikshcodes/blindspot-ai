import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  customFetch,
  type ErrorType,
  useSearchResources,
  useListResources,
  useGetResource,
  useSaveResource,
  useRemoveSavedResource,
  getListResourcesQueryKey,
  getGetResourceQueryKey,
} from '@workspace/api-client-react';
import type { ResourceSearchHistoryEntry } from '../types/resources';

export {
  useSearchResources,
  useListResources,
  useGetResource,
  useSaveResource,
  useRemoveSavedResource,
  getListResourcesQueryKey,
  getGetResourceQueryKey,
};

export const fetchResourceSearchHistory = async (
  projectId: string,
  params?: { page?: number; limit?: number },
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: { items: ResourceSearchHistoryEntry[]; pagination: { page: number; limit: number } } }> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return customFetch<{ success: true; data: { items: ResourceSearchHistoryEntry[]; pagination: { page: number; limit: number } } }>(
    `/api/projects/${projectId}/resources/searches${queryString}`,
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetResourceSearchHistory = (
  projectId: string,
  params?: { page?: number; limit?: number },
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: { items: ResourceSearchHistoryEntry[]; pagination: { page: number; limit: number } } }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/projects', projectId, 'resources', 'searches', params],
    queryFn: ({ signal }) => fetchResourceSearchHistory(projectId, params, { signal }),
    enabled: Boolean(projectId),
    ...options?.query,
  });
};

