import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as promptsApi from './api';

export const promptKeys = {
  all: ['ai-prompts'] as const,
};

/** All 16 prompts (each already carries current_value + default_value, so the
 *  editor needs no per-item fetch — the list is the source of truth). */
export function useAiPrompts() {
  return useQuery({
    queryKey: promptKeys.all,
    queryFn: promptsApi.listAiPrompts,
    staleTime: 60_000,
  });
}

/** PUT a new value; refresh the list so is_overridden + current_value update. */
export function useUpdateAiPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => promptsApi.updateAiPrompt(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: promptKeys.all }),
  });
}

/** Reset to default; refresh the list. */
export function useResetAiPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => promptsApi.resetAiPrompt(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: promptKeys.all }),
  });
}
