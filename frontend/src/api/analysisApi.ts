import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import {
  customFetch,
  type ErrorType,
} from '@workspace/api-client-react';
import type {
  FullAnalysis,
  BlindspotsArtifactResponse,
  InterviewQuestionsArtifactResponse,
  AnalysisSummaryArtifactResponse,
  ScoredAssumption,
  AnalysisHistoryItem,
  AssumptionStatus,
} from '../types/analysis';

export interface AnalyzeProjectVariables {
  id: string;
  data: {
    marketContext?: string;
    additionalContext?: string;
  };
}

export interface AnalyzeProjectSuccessResponse {
  success: true;
  data: FullAnalysis;
}

export interface UpdateAssumptionVariables {
  id: string;
  data: {
    status: AssumptionStatus;
    evidenceIds?: string[];
  };
}

/**
 * Trigger Real AI Analysis for a project
 * POST /api/projects/:id/analyze
 */
export const executeAnalysis = async (
  variables: AnalyzeProjectVariables,
  options?: Parameters<typeof customFetch>[1]
): Promise<AnalyzeProjectSuccessResponse> => {
  return customFetch<AnalyzeProjectSuccessResponse>(`/api/projects/${variables.id}/analyze`, {
    ...options,
    method: 'POST',
    body: JSON.stringify(variables.data),
  });
};

export const useRunRealAnalysis = (
  options?: {
    mutation?: UseMutationOptions<AnalyzeProjectSuccessResponse, ErrorType<unknown>, AnalyzeProjectVariables>;
  }
) => {
  return useMutation({
    mutationFn: (variables: AnalyzeProjectVariables) => executeAnalysis(variables),
    ...options?.mutation,
  });
};

/**
 * Get Latest Analysis for a project
 * GET /api/projects/:id/analysis
 */
export const fetchLatestAnalysis = async (
  projectId: string,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: FullAnalysis }> => {
  return customFetch<{ success: true; data: FullAnalysis }>(`/api/projects/${projectId}/analysis`, {
    ...options,
    method: 'GET',
  });
};

export const useGetLatestProjectAnalysis = (
  projectId: string,
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: FullAnalysis }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/projects', projectId, 'analysis'],
    queryFn: ({ signal }) => fetchLatestAnalysis(projectId, { signal }),
    enabled: Boolean(projectId),
    ...options?.query,
  });
};

/**
 * Get specific Analysis by ID
 * GET /api/analyses/:id
 */
export const fetchAnalysisById = async (
  analysisId: string,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: FullAnalysis }> => {
  return customFetch<{ success: true; data: FullAnalysis }>(`/api/analyses/${analysisId}`, {
    ...options,
    method: 'GET',
  });
};

export const useGetAnalysisDetails = (
  analysisId: string,
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: FullAnalysis }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/analyses', analysisId],
    queryFn: ({ signal }) => fetchAnalysisById(analysisId, { signal }),
    enabled: Boolean(analysisId),
    ...options?.query,
  });
};

/**
 * List Analysis History for a project
 * GET /api/projects/:id/analyses
 */
export const fetchAnalysisHistory = async (
  projectId: string,
  params?: { page?: number; limit?: number },
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: { items: AnalysisHistoryItem[]; pagination: { page: number; limit: number } } }> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return customFetch<{ success: true; data: { items: AnalysisHistoryItem[]; pagination: { page: number; limit: number } } }>(
    `/api/projects/${projectId}/analyses${queryString}`,
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetAnalysisHistory = (
  projectId: string,
  params?: { page?: number; limit?: number },
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: { items: AnalysisHistoryItem[]; pagination: { page: number; limit: number } } }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/projects', projectId, 'analyses', params],
    queryFn: ({ signal }) => fetchAnalysisHistory(projectId, params, { signal }),
    enabled: Boolean(projectId),
    ...options?.query,
  });
};

/**
 * List Assumptions for an analysis
 * GET /api/analyses/:id/assumptions
 */
export const fetchAnalysisAssumptions = async (
  analysisId: string,
  params?: { page?: number; limit?: number },
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: { items: ScoredAssumption[]; pagination: { page: number; limit: number; total: number } } }> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return customFetch<{ success: true; data: { items: ScoredAssumption[]; pagination: { page: number; limit: number; total: number } } }>(
    `/api/analyses/${analysisId}/assumptions${queryString}`,
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetAnalysisAssumptions = (
  analysisId: string,
  params?: { page?: number; limit?: number },
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: { items: ScoredAssumption[]; pagination: { page: number; limit: number; total: number } } }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/analyses', analysisId, 'assumptions', params],
    queryFn: ({ signal }) => fetchAnalysisAssumptions(analysisId, params, { signal }),
    enabled: Boolean(analysisId),
    ...options?.query,
  });
};

/**
 * Get Blindspots for an analysis
 * GET /api/analyses/:id/blindspots
 */
export const fetchAnalysisBlindspots = async (
  analysisId: string,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: BlindspotsArtifactResponse }> => {
  return customFetch<{ success: true; data: BlindspotsArtifactResponse }>(
    `/api/analyses/${analysisId}/blindspots`,
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetAnalysisBlindspots = (
  analysisId: string,
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: BlindspotsArtifactResponse }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/analyses', analysisId, 'blindspots'],
    queryFn: ({ signal }) => fetchAnalysisBlindspots(analysisId, { signal }),
    enabled: Boolean(analysisId),
    ...options?.query,
  });
};

/**
 * Get Mom Test Interview Questions for an analysis
 * GET /api/analyses/:id/interview-questions
 */
export const fetchAnalysisInterviewQuestions = async (
  analysisId: string,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: InterviewQuestionsArtifactResponse }> => {
  return customFetch<{ success: true; data: InterviewQuestionsArtifactResponse }>(
    `/api/analyses/${analysisId}/interview-questions`,
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetAnalysisInterviewQuestions = (
  analysisId: string,
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: InterviewQuestionsArtifactResponse }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/analyses', analysisId, 'interview-questions'],
    queryFn: ({ signal }) => fetchAnalysisInterviewQuestions(analysisId, { signal }),
    enabled: Boolean(analysisId),
    ...options?.query,
  });
};

/**
 * Get Analysis Summary & Provider Metadata
 * GET /api/analyses/:id/summary
 */
export const fetchAnalysisSummary = async (
  analysisId: string,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: AnalysisSummaryArtifactResponse }> => {
  return customFetch<{ success: true; data: AnalysisSummaryArtifactResponse }>(
    `/api/analyses/${analysisId}/summary`,
    {
      ...options,
      method: 'GET',
    }
  );
};

export const useGetAnalysisSummary = (
  analysisId: string,
  options?: {
    query?: Partial<UseQueryOptions<{ success: true; data: AnalysisSummaryArtifactResponse }, ErrorType<unknown>>>;
  }
) => {
  return useQuery({
    queryKey: ['/api/analyses', analysisId, 'summary'],
    queryFn: ({ signal }) => fetchAnalysisSummary(analysisId, { signal }),
    enabled: Boolean(analysisId),
    ...options?.query,
  });
};

/**
 * Update Assumption Status with validation and evidence
 * PATCH /api/assumptions/:id
 */
export const executeAssumptionStatusUpdate = async (
  variables: UpdateAssumptionVariables,
  options?: Parameters<typeof customFetch>[1]
): Promise<{ success: true; data: ScoredAssumption }> => {
  return customFetch<{ success: true; data: ScoredAssumption }>(`/api/assumptions/${variables.id}`, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(variables.data),
  });
};

export const useUpdateAssumptionStatus = (
  options?: {
    mutation?: UseMutationOptions<{ success: true; data: ScoredAssumption }, ErrorType<unknown>, UpdateAssumptionVariables>;
  }
) => {
  return useMutation({
    mutationFn: (variables: UpdateAssumptionVariables) => executeAssumptionStatusUpdate(variables),
    ...options?.mutation,
  });
};
