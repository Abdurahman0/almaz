import { api } from '@/shared/api/client';
import type { LoginRequest, MeResponse, TokenResponse } from '@/shared/api/types';

export async function login(body: LoginRequest): Promise<TokenResponse> {
  return (await api.post<TokenResponse>('/auth/login', body)).data;
}

export async function fetchMe(): Promise<MeResponse> {
  return (await api.get<MeResponse>('/auth/me')).data;
}

export async function logoutApi(): Promise<void> {
  await api.post('/auth/logout');
}
