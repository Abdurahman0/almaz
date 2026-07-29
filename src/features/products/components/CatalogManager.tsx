import { useMemo, useState } from 'react';
import { Check, ChevronDown, Palette, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CategoryBoxes } from './CategoryBoxes';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  NumberInput,
  Select,
  SkeletonRows,
  toast,
  type SelectOption,
} from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import {
  useCategories,
  useCreateCategory,
  useCreateRef,
  useDeleteCategory,
  useDeleteRef,
  useRefs,
  useUpdateCategory,
  useUpdateRef,
} from '../hooks';
import type { CategoryOut, RefKind, RefOut } from '@/shared/api/types';

type Tab = 'categories' | RefKind;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'categories', label: 'Kategoriyalar' },
  { id: 'genders', label: 'Kim uchun' },
  { id: 'materials', label: 'Material' },
  { id: 'stones', label: 'Tosh turi' },
];

// ---------------- Reference dictionary tab (gender / material / stone) ----------
interface RefDraft {
  name_uz: string;
  name_ru: string;
  is_active: boolean;
  sort_order: number | '';
}
const emptyRef: RefDraft = { name_uz: '', name_ru: '', is_active: true, sort_order: '' };

function RefEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: RefDraft;
  setDraft: (d: RefDraft) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
      <div className="min-w-[140px] flex-1">
        <Input label="Nomi (uz)" value={draft.name_uz} onChange={(e) => setDraft({ ...draft, name_uz: e.target.value })} />
      </div>
      <div className="min-w-[140px] flex-1">
        <Input label="Nomi (ru)" value={draft.name_ru} onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} />
      </div>
      <div className="w-24">
        <NumberInput label="Tartib" size="sm" value={draft.sort_order} onChange={(v) => setDraft({ ...draft, sort_order: v })} min={0} />
      </div>
      <div className="pb-2">
        <Checkbox checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} label="Faol" />
      </div>
      <Button size="sm" onClick={onSave} loading={saving} disabled={draft.name_uz.trim().length < 1}>
        <Check className="h-4 w-4" strokeWidth={2} /> Saqlash
      </Button>
      {onCancel && (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      )}
    </div>
  );
}

function RefTab({ kind }: { kind: RefKind }) {
  const lang = useUiStore((s) => s.lang);
  const list = useRefs(kind, false);
  const create = useCreateRef(kind);
  const update = useUpdateRef(kind);
  const remove = useDeleteRef(kind);

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<RefDraft>(emptyRef);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RefDraft>(emptyRef);
  const [deleting, setDeleting] = useState<RefOut | null>(null);

  const toBody = (d: RefDraft) => ({
    name_uz: d.name_uz.trim(),
    name_ru: d.name_ru.trim() || null,
    is_active: d.is_active,
    sort_order: d.sort_order === '' ? 0 : d.sort_order,
  });

  const startEdit = (r: RefOut) => {
    setEditId(r.id);
    setEditDraft({ name_uz: r.name_uz, name_ru: r.name_ru ?? '', is_active: r.is_active, sort_order: r.sort_order });
  };

  return (
    <div className="space-y-3">
      {list.isPending && <SkeletonRows rows={4} />}
      <div className="space-y-2">
        {list.data?.map((r) =>
          editId === r.id ? (
            <RefEditor
              key={r.id}
              draft={editDraft}
              setDraft={setEditDraft}
              saving={update.isPending}
              onCancel={() => setEditId(null)}
              onSave={() =>
                update.mutate(
                  { id: r.id, body: toBody(editDraft) },
                  { onSuccess: () => { setEditId(null); toast.success('Saqlandi'); }, onError: () => toast.error('Xatolik') },
                )
              }
            />
          ) : (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {pickName(r, lang)}
                  {r.name_ru && <span className="ml-2 text-xs text-muted">{r.name_uz} / {r.name_ru}</span>}
                </p>
                <p className="text-2xs text-muted">Tartib: {r.sort_order}</p>
              </div>
              <div className="flex items-center gap-2">
                {!r.is_active && <Badge tone="muted">Nofaol</Badge>}
                <button aria-label="Tahrirlash" onClick={() => startEdit(r)} className="rounded p-1.5 text-muted hover:text-accent-ink">
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button aria-label="O'chirish" onClick={() => setDeleting(r)} className="rounded p-1.5 text-muted hover:text-danger">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <RefEditor
          draft={addDraft}
          setDraft={setAddDraft}
          saving={create.isPending}
          onCancel={() => { setAdding(false); setAddDraft(emptyRef); }}
          onSave={() =>
            create.mutate(toBody(addDraft), {
              onSuccess: () => { setAdding(false); setAddDraft(emptyRef); toast.success("Qo'shildi"); },
              onError: () => toast.error('Xatolik'),
            })
          }
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Qo'shish
        </Button>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        heading="O'chirishni tasdiqlang"
        description={`«${deleting ? pickName(deleting, lang) : ''}» butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success("O'chirildi");
          setDeleting(null);
        }}
      />
    </div>
  );
}

// ---------------- Category tab ----------------
interface CatDraft {
  name_uz: string;
  name_ru: string;
  slug: string;
  parent_id: string;
  requiresRingSize: boolean;
}
const emptyCat: CatDraft = { name_uz: '', name_ru: '', slug: '', parent_id: '', requiresRingSize: false };

function CategoryEditor({
  draft,
  setDraft,
  parentOptions,
  onSave,
  onCancel,
  saving,
}: {
  draft: CatDraft;
  setDraft: (d: CatDraft) => void;
  parentOptions: SelectOption[];
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <Input label="Nomi (uz)" value={draft.name_uz} onChange={(e) => setDraft({ ...draft, name_uz: e.target.value })} />
        <Input label="Nomi (ru)" value={draft.name_ru} onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} />
        <Input label="Slug (ixtiyoriy)" placeholder="nomdan avtomatik" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
        <Select label="Yuqori kategoriya" size="sm" placeholder="—" options={parentOptions} value={draft.parent_id} onChange={(v) => setDraft({ ...draft, parent_id: v })} />
      </div>
      <Checkbox
        checked={draft.requiresRingSize}
        onCheckedChange={(v) => setDraft({ ...draft, requiresRingSize: v })}
        label="Buyurtmada o'lcham talab qilinadi (uzuklar)"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} loading={saving} disabled={draft.name_uz.trim().length < 1}>
          <Check className="h-4 w-4" strokeWidth={2} /> Saqlash
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Bekor
          </Button>
        )}
      </div>
    </div>
  );
}

function CategoryTab() {
  const lang = useUiStore((s) => s.lang);
  const list = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<CatDraft>(emptyCat);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CatDraft>(emptyCat);
  const [deleting, setDeleting] = useState<CategoryOut | null>(null);
  const [boxesId, setBoxesId] = useState<string | null>(null);

  const parentOptions = useMemo<SelectOption[]>(
    () => (list.data ?? []).filter((c) => c.id !== editId).map((c) => ({ value: c.id, label: pickName(c, lang) })),
    [list.data, lang, editId],
  );

  const toBody = (d: CatDraft) => ({
    name_uz: d.name_uz.trim(),
    name_ru: d.name_ru.trim() || null,
    slug: d.slug.trim() || null,
    parent_id: d.parent_id || null,
    requires_ring_size: d.requiresRingSize,
  });

  const startEdit = (c: CategoryOut) => {
    setEditId(c.id);
    setEditDraft({
      name_uz: c.name_uz,
      name_ru: c.name_ru ?? '',
      slug: c.slug ?? '',
      parent_id: c.parent_id ?? '',
      requiresRingSize: c.requires_ring_size ?? false,
    });
  };

  return (
    <div className="space-y-3">
      {list.isPending && <SkeletonRows rows={4} />}
      <div className="space-y-2">
        {list.data?.map((c) =>
          editId === c.id ? (
            <CategoryEditor
              key={c.id}
              draft={editDraft}
              setDraft={setEditDraft}
              parentOptions={parentOptions}
              saving={update.isPending}
              onCancel={() => setEditId(null)}
              onSave={() =>
                update.mutate(
                  { id: c.id, body: toBody(editDraft) },
                  { onSuccess: () => { setEditId(null); toast.success('Saqlandi'); }, onError: () => toast.error('Xatolik') },
                )
              }
            />
          ) : (
            <div key={c.id} className="rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{pickName(c, lang)}</p>
                  <p className="text-2xs text-muted">{c.slug}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Ranglar / qutilar"
                    aria-expanded={boxesId === c.id}
                    onClick={() => setBoxesId((id) => (id === c.id ? null : c.id))}
                    className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      boxesId === c.id ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:text-text'
                    }`}
                  >
                    <Palette className="h-4 w-4" strokeWidth={1.5} /> Ranglar
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${boxesId === c.id ? 'rotate-180' : ''}`}
                      strokeWidth={1.5}
                    />
                  </button>
                  <button aria-label="Tahrirlash" onClick={() => startEdit(c)} className="rounded p-1.5 text-muted hover:text-accent-ink">
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button aria-label="O'chirish" onClick={() => setDeleting(c)} className="rounded p-1.5 text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              {boxesId === c.id && (
                <div className="px-3 pb-3">
                  <CategoryBoxes categoryId={c.id} />
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {adding ? (
        <CategoryEditor
          draft={addDraft}
          setDraft={setAddDraft}
          parentOptions={parentOptions}
          saving={create.isPending}
          onCancel={() => { setAdding(false); setAddDraft(emptyCat); }}
          onSave={() =>
            create.mutate(toBody(addDraft), {
              onSuccess: () => { setAdding(false); setAddDraft(emptyCat); toast.success("Qo'shildi"); },
              onError: () => toast.error('Xatolik'),
            })
          }
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Kategoriya qo'shish
        </Button>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        heading="Kategoriyani o'chirish"
        description={`«${deleting ? pickName(deleting, lang) : ''}» butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success("O'chirildi");
          setDeleting(null);
        }}
      />
    </div>
  );
}

export function CatalogManager() {
  const [tab, setTab] = useState<Tab>('categories');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-accent-btn text-on-accent' : 'bg-surface-2 text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'categories' ? <CategoryTab /> : <RefTab kind={tab} />}
    </div>
  );
}
