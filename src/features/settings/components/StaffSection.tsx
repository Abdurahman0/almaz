import { useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, UserRound } from 'lucide-react';
import { Badge, Button, Card, ErrorCard, Input, Modal, Select, SkeletonRows } from '@/shared/ui';
import { useCreateStaff, useRoles, useStaff, useToggleStaff } from '../rbac';

const schema = z.object({
  full_name: z.string().min(3, 'Ism kamida 3 ta belgi'),
  email: z.string().email("Email noto'g'ri"),
  password: z.string().min(6, 'Parol kamida 6 ta belgi'),
  role_id: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function StaffSection() {
  const staff = useStaff();
  const roles = useRoles();
  const createStaff = useCreateStaff();
  const toggleStaff = useToggleStaff();
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = form.handleSubmit((v) => {
    createStaff.mutate(
      {
        full_name: v.full_name,
        email: v.email,
        password: v.password,
        role_ids: v.role_id ? [v.role_id] : null,
      },
      { onSuccess: () => { setOpen(false); form.reset(); } },
    );
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-md font-semibold text-text">Xodimlar</h2>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Xodim qo'shish
        </Button>
      </div>

      {staff.isPending && <SkeletonRows rows={3} />}
      {staff.isError && <ErrorCard error={staff.error} onRetry={() => staff.refetch()} />}
      <div className="space-y-3">
        {staff.data?.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <UserRound className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{u.full_name}</p>
                <p className="text-xs text-muted">{u.email} · {u.roles.join(', ') || 'rolsiz'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={u.is_active ? 'success' : 'muted'}>{u.is_active ? 'Faol' : 'Nofaol'}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleStaff.mutate({ id: u.id, isActive: !u.is_active })}
              >
                {u.is_active ? "O'chirish" : 'Yoqish'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} heading="Xodim qo'shish">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input label="F.I.Sh." error={form.formState.errors.full_name?.message} {...form.register('full_name')} />
          <Input label="Email" type="email" error={form.formState.errors.email?.message} {...form.register('email')} />
          <Input
            label="Parol"
            type="password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Controller
            control={form.control}
            name="role_id"
            render={({ field }) => (
              <Select
                label="Rol"
                placeholder="—"
                options={(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={createStaff.isPending}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
