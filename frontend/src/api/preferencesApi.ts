import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { customFetch, type ErrorType } from '@workspace/api-client-react';
import type { UserPreferencesRecord } from '../types/preferences';

export const USER_PREFERENCES_QUERY_KEY = ['/api/user/preferences'] as const;

export const fetchUserPreferences = async (
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: UserPreferencesRecord }> => {
  return customFetch<{ success: true; data: UserPreferencesRecord }>(
    '/api/user/preferences',
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetUserPreferences = (
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: UserPreferencesRecord }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: USER_PREFERENCES_QUERY_KEY,
    queryFn: ({ signal }) => fetchUserPreferences({ signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options?.query,
  });
};

export const saveUserPreferences = async (
  preferences: Pick<UserPreferencesRecord, 'notificationPreferences' | 'appPreferences'>,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: UserPreferencesRecord }> => {
  return customFetch<{ success: true; data: UserPreferencesRecord }>(
    '/api/user/preferences',
    {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    }
  );
};

export const useUpdateUserPreferences = (
  options?: {
    mutation?: UseMutationOptions<
      { success: true; data: UserPreferencesRecord },
      ErrorType<unknown>,
      Pick<UserPreferencesRecord, 'notificationPreferences' | 'appPreferences'>
    >;
  }
) => {
  return useMutation({
    mutationFn: (preferences) => saveUserPreferences(preferences),
    ...options?.mutation,
  });
};
