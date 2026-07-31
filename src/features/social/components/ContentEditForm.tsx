import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock } from 'lucide-react';
import { Button, Checkbox, DatePicker, ImageUpload, Textarea, TimePicker, toast } from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { ContentStatus } from '@/shared/api/types';
import { useUpdateSocial } from '../hooks';
import { contentStatusLabel, kindLabel, type SocialItem } from '../api';
import { combineScheduleISO, isScheduledPast, MAX_CAPTION, splitScheduleLocal } from '../schedule';

const STATUSES: ContentStatus[] = ['draft', 'scheduled', 'published'];

const schema = z
  .object({
    caption: z.string().max(MAX_CAPTION, `Izoh ${MAX_CAPTION} belgidan oshmasin`).optional(),
    status: z.enum(['draft', 'scheduled', 'published']),
    schedDate: z.string(),
    schedTime: z.string(),
    imageUrl: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'scheduled') {
      if (!v.schedDate || !v.schedTime) {
        ctx.addIssue({ path: ['schedDate'], code: z.ZodIssueCode.custom, message: 'Sana va vaqtni tanlang' });
      } else if (isScheduledPast(v.schedDate, v.schedTime)) {
        ctx.addIssue({ path: ['schedDate'], code: z.ZodIssueCode.custom, message: "O'tgan vaqtni tanlab bo'lmaydi" });
      }
    }
  });
type FormValues = z.infer<typeof schema>;

/** Edit an existing content item (caption / status / schedule / image / active).
 *  Saves via the optimistic update mutation. */
export function ContentEditForm({ item, onDone }: { item: SocialItem; onDone: () => void }) {
  const lang = useUiStore((s) => s.lang);
  const update = useUpdateSocial();
  const seeded = splitScheduleLocal(item.scheduled_at);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      caption: item.caption ?? '',
      status: item.status,
      schedDate: seeded.date,
      schedTime: seeded.time,
      imageUrl: item.image_url ?? '',
      isActive: item.is_active,
    },
    mode: 'onChange',
  });

  const status = form.watch('status');
  const imageUrl = form.watch('imageUrl');
  const caption = form.watch('caption') ?? '';

  const submit = form.handleSubmit((v) => {
    update.mutate(
      {
        id: item.id,
        body: {
          caption: v.caption?.trim() || null,
          status: v.status,
          scheduled_at: v.status === 'scheduled' ? combineScheduleISO(v.schedDate, v.schedTime) : null,
          image_url: v.imageUrl.trim() || null,
          is_active: v.isActive,
        },
      },
      {
        onSuccess: () => { toast.success('Saqlandi'); onDone(); },
        onError: () => toast.error('Saqlashda xatolik'),
      },
    );
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">{kindLabel[item.kind]} · {pickName(item.product, lang)}</p>

      <div>
        <Textarea label="Izoh (caption)" placeholder="Post matni…" maxLength={MAX_CAPTION} {...form.register('caption')} />
        <div className="mt-1 flex justify-between">
          {form.formState.errors.caption ? <span className="text-2xs text-danger">{form.formState.errors.caption.message}</span> : <span />}
          <span className={`tnum text-2xs ${caption.length > MAX_CAPTION - 100 ? 'text-danger' : 'text-muted'}`}>{caption.length} / {MAX_CAPTION}</span>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Holat</p>
        <div className="flex gap-1 rounded-[var(--r-sm)] bg-surface-2 p-0.5">
          {STATUSES.map((s) => (
            <button key={s} type="button" onClick={() => form.setValue('status', s, { shouldValidate: true })}
              className={`flex-1 rounded-[var(--r-xs)] py-1.5 text-xs font-semibold transition-colors ${status === s ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text'}`}>
              {contentStatusLabel[s]}
            </button>
          ))}
        </div>
        {status === 'scheduled' && (
          <div className="mt-3 rounded-[var(--r-sm)] border border-border bg-surface-2/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-2xs font-medium text-muted"><CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} /> Rejalashtirilgan vaqt</p>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[9rem] flex-1">
                <Controller control={form.control} name="schedDate" render={({ field }) => (
                  <DatePicker size="sm" value={field.value} onChange={field.onChange} error={form.formState.errors.schedDate?.message} />
                )} />
              </div>
              <div className="w-28">
                <Controller control={form.control} name="schedTime" render={({ field }) => (
                  <TimePicker size="sm" value={field.value} onChange={field.onChange} />
                )} />
              </div>
            </div>
          </div>
        )}
      </div>

      <ImageUpload label="Rasm" value={imageUrl || null} onChange={(url) => form.setValue('imageUrl', url ?? '', { shouldDirty: true })} />

      <Controller control={form.control} name="isActive" render={({ field }) => (
        <Checkbox checked={field.value} onCheckedChange={field.onChange} label="Faol (lentada ko'rsatiladi)" />
      )} />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>Bekor qilish</Button>
        <Button type="submit" loading={update.isPending}>Saqlash</Button>
      </div>
    </form>
  );
}
