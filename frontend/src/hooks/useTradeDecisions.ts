import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tradeDecisionApi } from '../api/tradeDecision.api';

export function useDecision(signalId: number | null) {
  return useQuery({
    queryKey: ['trade-decision', signalId],
    queryFn: () => tradeDecisionApi.get(signalId!),
    enabled: signalId != null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertDecision(signalId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      decision: 'TAKEN' | 'SKIPPED' | 'MODIFIED';
      notes?: string;
      actual_entry?: number;
      actual_qty?: number;
    }) => tradeDecisionApi.upsert(signalId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-decision', signalId] });
      queryClient.invalidateQueries({ queryKey: ['decision-history'] });
      toast.success('Decision saved');
    },
    onError: () => {
      toast.error('Failed to save decision');
    },
  });
}

export function useDecisionHistory(limit = 50) {
  return useQuery({
    queryKey: ['decision-history', limit],
    queryFn: () => tradeDecisionApi.history(limit),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
