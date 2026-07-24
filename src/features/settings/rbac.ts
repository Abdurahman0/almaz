import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getItems } from '@/shared/api/client';
import type { AuditLogOut, RoleOut, UserCreate, UserDetailOut } from '@/shared/api/types';

export const rbacKeys = {
  users: ['rbac', 'users'] as const,
  roles: ['rbac', 'roles'] as const,
  audit: ['audit'] as const,
};

export function useStaff() {
  return useQuery({
    queryKey: rbacKeys.users,
    queryFn: () => getItems<UserDetailOut>('/rbac/users', { params: { limit: 200 } }),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: rbacKeys.roles,
    queryFn: () => getItems<RoleOut>('/rbac/roles', { params: { limit: 200 } }),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UserCreate) => (await api.post<UserDetailOut>('/rbac/users', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.users }),
  });
}

export function useToggleStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch<UserDetailOut>(`/rbac/users/${id}`, { is_active: isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: rbacKeys.users }),
  });
}

export function useAudit() {
  return useQuery({
    queryKey: rbacKeys.audit,
    queryFn: () => getItems<AuditLogOut>('/audit', { params: { limit: 30 } }),
  });
}
