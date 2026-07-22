import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mockCreateClient,
  mockDeleteClient,
  mockListClients,
  mockUpdateClient,
  type MockClientInput,
} from '@/shared/mocks/clients';

export const clientKeys = {
  all: ['clients'] as const,
};

export function useClients() {
  return useQuery({ queryKey: clientKeys.all, queryFn: mockListClients });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MockClientInput) => mockCreateClient(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MockClientInput> }) =>
      mockUpdateClient(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockDeleteClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.all }),
  });
}
