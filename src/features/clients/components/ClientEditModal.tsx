import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal, toast } from '@/shared/ui';
import type { ApiError } from '@/shared/api/client';
import { useUpdateClient, type ClientRow } from '../hooks';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Ism kamida 2 ta belgi'),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\+?[\d\s-]{7,17}$/.test(v), "Telefon raqami noto'g'ri"),
});
type FormValues = z.infer<typeof schema>;

interface ClientEditModalProps {
  client: ClientRow | null;
  onClose: () => void;
}

/** Edit a client's name/phone — PATCH /inbox/customers/{id} (partial; empty
 *  phone clears the field with null). */
export function ClientEditModal({ client, onClose }: ClientEditModalProps) {
  const update = useUpdateClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', phone: '' },
  });

  // Re-seed whenever a different client is opened.
  useEffect(() => {
    if (client) {
      form.reset({
        full_name: /^Mijoz /.test(client.name) ? '' : client.name.replace(/^@/, ''),
        phone: client.phone ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const submit = form.handleSubmit((v) => {
    if (!client) return;
    update.mutate(
      { id: client.id, body: { full_name: v.full_name.trim(), phone: v.phone.trim() || null } },
      {
        onSuccess: () => {
          toast.success('Mijoz saqlandi');
          onClose();
        },
        onError: (e) => toast.error((e as unknown as ApiError).message ?? 'Saqlashda xatolik'),
      },
    );
  });

  return (
    <Modal open={Boolean(client)} onClose={onClose} heading="Mijozni tahrirlash">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="F.I.Sh."
          placeholder={client && /^Mijoz /.test(client.name) ? client.name : undefined}
          error={form.formState.errors.full_name?.message}
          {...form.register('full_name')}
        />
        <Input
          label="Telefon"
          placeholder="+998 90 123 45 67"
          inputMode="tel"
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />
        <p className="text-xs text-muted">
          Bo'sh telefon maydoni raqamni o'chiradi. O'zgarishlar Inbox'dagi mijoz kartasiga ham taalluqli.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" loading={update.isPending}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}
