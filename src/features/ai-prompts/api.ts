import { api } from '@/shared/api/client';
import type { AiPromptOut } from './types';

/** GET /ai/prompts — all 16 editable AI texts (perm ai:view). */
export async function listAiPrompts(): Promise<AiPromptOut[]> {
  return (await api.get<AiPromptOut[]>('/ai/prompts')).data;
}

/** GET /ai/prompts/{key} — one prompt. */
export async function getAiPrompt(key: string): Promise<AiPromptOut> {
  return (await api.get<AiPromptOut>(`/ai/prompts/${key}`)).data;
}

/** PUT /ai/prompts/{key} — override the value (min length 1). perm ai:edit_prompt. */
export async function updateAiPrompt(key: string, value: string): Promise<AiPromptOut> {
  return (await api.put<AiPromptOut>(`/ai/prompts/${key}`, { value })).data;
}

/** POST /ai/prompts/{key}/reset — restore the default (no body). perm ai:edit_prompt. */
export async function resetAiPrompt(key: string): Promise<AiPromptOut> {
  return (await api.post<AiPromptOut>(`/ai/prompts/${key}/reset`)).data;
}
