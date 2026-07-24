import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/shared/stores/auth';
import type { TokenResponse } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Single-flight refresh: concurrent 401s wait for one refresh call. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    logout();
    return null;
  }
  try {
    const { data } = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    logout();
    return null;
  }
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const token = await refreshPromise;
      refreshPromise = null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

/** Standard list envelope returned by every paginated GET (migration 0010). */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Fetch a list endpoint tolerant of both the new `{items,total,limit,offset}`
 * envelope and a legacy bare array, so rollout order never breaks the UI.
 */
export async function getList<T>(
  url: string,
  config?: Parameters<typeof api.get>[1],
): Promise<Paginated<T>> {
  const { data } = await api.get<Paginated<T> | T[]>(url, config);
  if (Array.isArray(data)) {
    return { items: data, total: data.length, limit: data.length, offset: 0 };
  }
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    limit: data?.limit ?? 0,
    offset: data?.offset ?? 0,
  };
}

/** Unwrap just the items array (for callers that don't page). */
export async function getItems<T>(
  url: string,
  config?: Parameters<typeof api.get>[1],
): Promise<T[]> {
  return (await getList<T>(url, config)).items;
}

export interface ApiError {
  status: number | null;
  message: string;
}

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? null;
  const data = error.response?.data as
    | { detail?: string | Array<{ msg?: string }> }
    | undefined;
  let message = "Server bilan bog'lanishda xatolik yuz berdi";
  if (typeof data?.detail === 'string') message = data.detail;
  else if (Array.isArray(data?.detail) && data.detail[0]?.msg) message = data.detail[0].msg;
  else if (error.code === 'ECONNABORTED') message = "So'rov vaqti tugadi";
  return { status, message };
}
