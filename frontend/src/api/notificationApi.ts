import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { customFetch, type ErrorType } from '@workspace/api-client-react';
import type { AppNotification, NotificationListResponse } from '../types/notifications';

export const NOTIFICATIONS_QUERY_KEY = ['/api/notifications'] as const;

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const fetchNotifications = async (
  params?: ListNotificationsParams,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: NotificationListResponse }> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.unreadOnly) query.append('unreadOnly', 'true');
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return customFetch<{ success: true; data: NotificationListResponse }>(
    `/api/notifications${queryString}`,
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetNotifications = (
  params?: ListNotificationsParams,
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: NotificationListResponse }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params],
    queryFn: ({ signal }) => fetchNotifications(params, { signal }),
    refetchInterval: 30000, // Poll every 30s for fresh notifications
    ...options?.query,
  });
};

export const markNotificationRead = async (
  id: string,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: AppNotification }> => {
  return customFetch<{ success: true; data: AppNotification }>(
    `/api/notifications/${id}/read`,
    {
      ...options,
      method: 'PATCH',
    }
  );
};

export const useMarkNotificationRead = (
  options?: {
    mutation?: UseMutationOptions<{ success: true; data: AppNotification }, ErrorType<unknown>, string>;
  }
) => {
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    ...options?.mutation,
  });
};

export const markAllNotificationsRead = async (
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: { markedCount: number } }> => {
  return customFetch<{ success: true; data: { markedCount: number } }>(
    '/api/notifications/mark-all-read',
    {
      ...options,
      method: 'POST',
    }
  );
};

export const useMarkAllNotificationsRead = (
  options?: {
    mutation?: UseMutationOptions<{ success: true; data: { markedCount: number } }, ErrorType<unknown>, void>;
  }
) => {
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    ...options?.mutation,
  });
};

export const dismissNotification = async (
  id: string,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: { deleted: boolean; id: string } }> => {
  return customFetch<{ success: true; data: { deleted: boolean; id: string } }>(
    `/api/notifications/${id}`,
    {
      ...options,
      method: 'DELETE',
    }
  );
};

export const useDismissNotification = (
  options?: {
    mutation?: UseMutationOptions<{ success: true; data: { deleted: boolean; id: string } }, ErrorType<unknown>, string>;
  }
) => {
  return useMutation({
    mutationFn: (id: string) => dismissNotification(id),
    ...options?.mutation,
  });
};

export const clearAllNotifications = async (
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: { cleared: boolean } }> => {
  return customFetch<{ success: true; data: { cleared: boolean } }>(
    '/api/notifications',
    {
      ...options,
      method: 'DELETE',
    }
  );
};

export const useClearAllNotifications = (
  options?: {
    mutation?: UseMutationOptions<{ success: true; data: { cleared: boolean } }, ErrorType<unknown>, void>;
  }
) => {
  return useMutation({
    mutationFn: () => clearAllNotifications(),
    ...options?.mutation,
  });
};
