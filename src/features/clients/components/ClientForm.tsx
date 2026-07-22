import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, DatePicker, Input, NumberInput, Textarea, toast } from '@/shared/ui';
import { useCreateClient, useUpdateClient } from '../hooks';
import type { MockClient } from '@/shared/mocks/clients';

const schema = z.object({
  fullName: z.string().min(3, 'Ism kamida 3 ta belgi'),
  phone: z.string().regex(/^\+998[\s\d]{9,13}$/, 'Telefon +998 bilan boshlanishi kerak'),
  ringSize: z
    .union([z.number().min(15, 'Kamida 15').max(22, "Ko'pi bilan 22"), z.literal('')])
    .optional(),
  anniversary: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface ClientFormProps {
  client?: MockClient;
  onDone: () => void;
}

export function ClientForm({ client, onDone }: ClientFormProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: client
      ? {
          fullName: client.fullName,
          phone: client.phone,
          ringSize: client.ringSize ?? '',
          anniversary: client.anniversary ?? '',
          notes: client.notes,
        }
      : { phone: '+998 ', ringSize: '' },
  });

  const pending = createClient.isPending || updateClient.isPending;

  const submit = form.handleSubmit((v) => {
    const input = {
      fullName: v.fullName,
      phone: v.phone,
      ringSize: v.ringSize === '' || v.ringSize === undefined ? null : v.ringSize,
      anniversary: v.anniversary || null,
      notes: v.notes ?? '',
    };
    const done = () => {
      toast.success(client ? 'Mijoz yangilandi' : "Mijoz qo'shildi");
      onDone();
    };
    if (client) updateClient.mutate({ id: client.id, input }, { onSuccess: done });
    else createClient.mutate(input, { onSuccess: done });
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="F.I.Sh." error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
      <Input label="Telefon" error={form.formState.errors.phone?.message} {...form.register('phone')} />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={form.control}
          name="ringSize"
          render={({ field, fieldState }) => (
            <NumberInput
              label="Uzuk o'lchami"
              value={field.value === undefined ? '' : field.value}
              onChange={field.onChange}
              min={15}
              max={22}
              step={0.5}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="anniversary"
          render={({ field, fieldState }) => (
            <DatePicker
              label="Nikoh kuni"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>
      <Textarea label="Izohlar" {...form.register('notes')} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" loading={pending}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
