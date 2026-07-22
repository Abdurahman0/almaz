import { useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorCard,
  Input,
  Modal,
  PageHeader,
  Select,
  SkeletonRows,
  Textarea,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib/format';
import * as kbApi from '../api';
import type { KnowledgeOut, KnowledgeType } from '@/shared/api/types';

const typeLabels: Record<KnowledgeType, string> = {
  faq: 'FAQ',
  policy: 'Siyosat',
  delivery: 'Yetkazish',
  payment: "To'lov",
  company: 'Kompaniya',
  guarantee: 'Kafolat',
  instruction: "Ko'rsatma",
};

const schema = z.object({
  type: z.enum(['faq', 'policy', 'delivery', 'payment', 'company', 'guarantee', 'instruction']),
  title: z.string().min(3, 'Sarlavha kamida 3 ta belgi'),
  content: z.string().min(10, 'Matn kamida 10 ta belgi'),
});
type FormValues = z.infer<typeof schema>;

export default function KnowledgePage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeOut | undefined>();

  const query = useQuery({ queryKey: ['knowledge'], queryFn: () => kbApi.listKnowledge() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['knowledge'] });
  const create = useMutation({ mutationFn: kbApi.createKnowledge, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: FormValues }) => kbApi.updateKnowledge(id, body),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: kbApi.deleteKnowledge, onSuccess: invalidate });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'faq' },
  });

  const openForm = (kb?: KnowledgeOut) => {
    setEditing(kb);
    form.reset(kb ? { type: kb.type, title: kb.title, content: kb.content } : { type: 'faq', title: '', content: '' });
    setFormOpen(true);
  };

  const submit = form.handleSubmit((v) => {
    const done = () => setFormOpen(false);
    if (editing) update.mutate({ id: editing.id, body: v }, { onSuccess: done });
    else create.mutate(v, { onSuccess: done });
  });

  return (
    <div>
      <PageHeader
        heading="AI bilim bazasi"
        subheading="AI sotuvchi shu maʼlumotlarga tayanadi"
        actions={
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Yangi yozuv
          </Button>
        }
      />

      {query.isPending && <SkeletonRows rows={5} />}
      {query.isError && <ErrorCard error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && query.data.length === 0 && (
        <Card>
          <EmptyState heading="Bilim bazasi bo'sh" hint="AI yaxshi sotishi uchun maʼlumot qo'shing" />
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {query.data?.map((kb) => (
          <Card key={kb.id} className="group relative">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone="gold">{typeLabels[kb.type]}</Badge>
              <span className="text-xs text-muted">{formatDate(kb.created_at)}</span>
            </div>
            <h2 className="text-sm font-semibold text-text">{kb.title}</h2>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted">{kb.content}</p>
            <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => openForm(kb)}
                aria-label="Tahrirlash"
                className="rounded-lg p-1.5 text-muted hover:text-accent-ink"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => remove.mutate(kb.id)}
                aria-label="O'chirish"
                className="rounded-lg p-1.5 text-muted hover:text-danger"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        heading={editing ? 'Yozuvni tahrirlash' : 'Yangi yozuv'}
        wide
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                label="Turi"
                options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Input label="Sarlavha" error={form.formState.errors.title?.message} {...form.register('title')} />
          <Textarea
            label="Matn"
            rows={7}
            error={form.formState.errors.content?.message}
            {...form.register('content')}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
