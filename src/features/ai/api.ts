import { api } from '@/shared/api/client';
import type {
  KnowledgeCreate,
  KnowledgeOut,
  KnowledgeType,
  KnowledgeUpdate,
} from '@/shared/api/types';

export async function listKnowledge(type?: KnowledgeType): Promise<KnowledgeOut[]> {
  return (await api.get<KnowledgeOut[]>('/ai/knowledge', { params: { type } })).data;
}

export async function createKnowledge(body: KnowledgeCreate): Promise<KnowledgeOut> {
  return (await api.post<KnowledgeOut>('/ai/knowledge', body)).data;
}

export async function updateKnowledge(id: string, body: KnowledgeUpdate): Promise<KnowledgeOut> {
  return (await api.patch<KnowledgeOut>(`/ai/knowledge/${id}`, body)).data;
}

export async function deleteKnowledge(id: string): Promise<void> {
  await api.delete(`/ai/knowledge/${id}`);
}
