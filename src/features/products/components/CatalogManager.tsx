import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
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
import { formatMoney } from '@/shared/lib/format';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import {
  useCategories,
  useCreateCategory,
  useCreateKurs,
  useCreateRef,
  useDeleteCategory,
  useDeleteKurs,
  useDeleteRef,
  useKurs,
  useRefs,
  useUpdateCategory,
  useUpdateKurs,
  useUpdateRef,
} from '../hooks';
import type { CategoryOut, KursOut, RefKind, RefOut } from '@/shared/api/types';

type Tab = 'categories' | 'kurs' | RefKind;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'categories', label: 'Kategoriyalar' },
  { id: 'kurs', label: 'Kurs (narx)' },
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
        description={`«${deleting ? pickName(deleting, lang) : ''}» o'chiriladi.`}
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => { setDeleting(null); toast.success("O'chirildi"); },
            onError: () => toast.error("O'chirishda xatolik"),
          })
        }
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
}
const emptyCat: CatDraft = { name_uz: '', name_ru: '', slug: '', parent_id: '' };

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
      <p className="text-2xs text-muted">Gramm narxi «Kurs» bo'limida boshqariladi.</p>
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

  const parentOptions = useMemo<SelectOption[]>(
    () => (list.data ?? []).filter((c) => c.id !== editId).map((c) => ({ value: c.id, label: pickName(c, lang) })),
    [list.data, lang, editId],
  );

  const toBody = (d: CatDraft) => ({
    name_uz: d.name_uz.trim(),
    name_ru: d.name_ru.trim() || null,
    slug: d.slug.trim() || null,
    parent_id: d.parent_id || null,
  });

  const startEdit = (c: CategoryOut) => {
    setEditId(c.id);
    setEditDraft({
      name_uz: c.name_uz,
      name_ru: c.name_ru ?? '',
      slug: c.slug ?? '',
      parent_id: c.parent_id ?? '',
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
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{pickName(c, lang)}</p>
                <p className="text-2xs text-muted">
                  {c.slug}
                  {c.active_gram_price != null && ` · ${formatMoney(Number(c.active_gram_price))}/g`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button aria-label="Tahrirlash" onClick={() => startEdit(c)} className="rounded p-1.5 text-muted hover:text-accent-ink">
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button aria-label="O'chirish" onClick={() => setDeleting(c)} className="rounded p-1.5 text-muted hover:text-danger">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
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
        heading="O'chirishni tasdiqlang"
        description={`«${deleting ? pickName(deleting, lang) : ''}» kategoriyasi o'chiriladi.`}
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => { setDeleting(null); toast.success("O'chirildi"); },
            onError: () => toast.error("O'chirishda xatolik"),
          })
        }
      />
    </div>
  );
}

// ---------------- Kurs tab (per-gram price, linked to category) ----------------
interface KursDraft {
  category_id: string;
  value: number | '';
  is_active: boolean;
  note: string;
}
const emptyKurs: KursDraft = { category_id: '', value: '', is_active: true, note: '' };

function KursEditor({
  draft,
  setDraft,
  categoryOptions,
  onSave,
  onCancel,
  saving,
}: {
  draft: KursDraft;
  setDraft: (d: KursDraft) => void;
  categoryOptions: SelectOption[];
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <Select label="Kategoriya" size="sm" placeholder="—" options={categoryOptions} value={draft.category_id} onChange={(v) => setDraft({ ...draft, category_id: v })} />
        <NumberInput label="1 gramm narxi" size="sm" value={draft.value} onChange={(v) => setDraft({ ...draft, value: v })} min={0} step={10_000} suffix="so'm" thousands />
        <Input label="Izoh (ixtiyoriy)" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        <div className="flex items-end pb-2">
          <Checkbox checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} label="Aktiv" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} loading={saving} disabled={!draft.category_id || draft.value === ''}>
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

function KursTab() {
  const lang = useUiStore((s) => s.lang);
  const categories = useCategories();
  const [filterCat, setFilterCat] = useState('');
  const list = useKurs(filterCat || undefined);
  const create = useCreateKurs();
  const update = useUpdateKurs();
  const remove = useDeleteKurs();

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<KursDraft>(emptyKurs);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<KursDraft>(emptyKurs);
  const [deleting, setDeleting] = useState<KursOut | null>(null);

  const categoryOptions = useMemo<SelectOption[]>(
    () => (categories.data ?? []).map((c) => ({ value: c.id, label: pickName(c, lang) })),
    [categories.data, lang],
  );
  const catName = (id: string) => pickName(categories.data?.find((c) => c.id === id), lang) || id.slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="w-full max-w-xs">
        <Select
          label="Kategoriya bo'yicha filtr"
          size="sm"
          placeholder="Barchasi"
          options={categoryOptions}
          value={filterCat}
          onChange={setFilterCat}
        />
      </div>
      {list.isPending && <SkeletonRows rows={4} />}
      <div className="space-y-2">
        {list.data?.map((k) =>
          editId === k.id ? (
            <KursEditor
              key={k.id}
              draft={editDraft}
              setDraft={setEditDraft}
              categoryOptions={categoryOptions}
              saving={update.isPending}
              onCancel={() => setEditId(null)}
              onSave={() =>
                update.mutate(
                  { id: k.id, body: { value: editDraft.value === '' ? 0 : editDraft.value, is_active: editDraft.is_active, note: editDraft.note.trim() || null } },
                  { onSuccess: () => { setEditId(null); toast.success('Saqlandi'); }, onError: () => toast.error('Xatolik') },
                )
              }
            />
          ) : (
            <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {catName(k.category_id)} — <span className="tnum text-accent-ink">{formatMoney(Number(k.value))}/g</span>
                </p>
                {k.note && <p className="truncate text-2xs text-muted">{k.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                {k.is_active ? <Badge tone="success">Aktiv</Badge> : <Badge tone="muted">Nofaol</Badge>}
                <button
                  aria-label="Tahrirlash"
                  onClick={() => {
                    setEditId(k.id);
                    setEditDraft({ category_id: k.category_id, value: Number(k.value), is_active: k.is_active, note: k.note ?? '' });
                  }}
                  className="rounded p-1.5 text-muted hover:text-accent-ink"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button aria-label="O'chirish" onClick={() => setDeleting(k)} className="rounded p-1.5 text-muted hover:text-danger">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ),
        )}
        {list.isSuccess && list.data.length === 0 && <p className="text-sm text-muted">Kurs qo'shilmagan</p>}
      </div>

      {adding ? (
        <KursEditor
          draft={addDraft}
          setDraft={setAddDraft}
          categoryOptions={categoryOptions}
          saving={create.isPending}
          onCancel={() => { setAdding(false); setAddDraft(emptyKurs); }}
          onSave={() =>
            create.mutate(
              { category_id: addDraft.category_id, value: addDraft.value === '' ? 0 : addDraft.value, is_active: addDraft.is_active, note: addDraft.note.trim() || null },
              {
                onSuccess: () => { setAdding(false); setAddDraft(emptyKurs); toast.success("Qo'shildi"); },
                onError: () => toast.error('Xatolik'),
              },
            )
          }
        />
      ) : (
        <Button size="sm" variant="secondary" onClick={() => { setAddDraft({ ...emptyKurs, category_id: filterCat }); setAdding(true); }}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Kurs qo'shish
        </Button>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        heading="O'chirishni tasdiqlang"
        description="Ushbu kurs o'chiriladi."
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => { setDeleting(null); toast.success("O'chirildi"); },
            onError: () => toast.error("O'chirishda xatolik"),
          })
        }
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
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id ? 'border-accent bg-accent-soft text-accent-ink' : 'border-border text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'categories' ? <CategoryTab /> : tab === 'kurs' ? <KursTab /> : <RefTab kind={tab} />}
    </div>
  );
}
