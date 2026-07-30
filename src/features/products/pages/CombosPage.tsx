import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, PackageOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorCard,
  Modal,
  Money,
  PageHeader,
  Pager,
  Select,
  SkeletonCards,
  productStatusLabels,
  toast,
  type SelectOption,
} from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import { useCombos, useDeleteCombo } from '../hooks';
import { ComboForm } from '../components/ComboForm';
import type { ComboOut } from '@/shared/api/types';

const PAGE_SIZE = 24;
const statusFilterOptions: SelectOption[] = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'active', label: 'Faol' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'archived', label: 'Arxiv' },
];

function ComboCard({ combo, name, onEdit, onDelete, onView }: {
  combo: ComboOut;
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const soldOut = combo.available <= 0;
  const discounted = combo.old_price != null;
  const cover = combo.images[0] ?? combo.items.find((i) => i.image_url)?.image_url ?? null;

  const menu = (
    <DropdownMenu
      items={[
        { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: onEdit },
        { label: "O'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: onDelete, destructive: true, separatorBefore: true },
      ]}
      trigger={
        <button aria-label="Amallar" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 text-muted backdrop-blur transition-colors hover:text-text">
          <span className="text-lg leading-none">⋯</span>
        </button>
      }
    />
  );

  return (
    <div
      onClick={onView}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 ${
        soldOut ? 'opacity-70 hover:opacity-100' : 'hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {cover ? (
          <img src={cover} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Layers className="h-10 w-10 text-muted/50" strokeWidth={1.25} />
          </div>
        )}

        <span className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>{menu}</span>

        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-2xs font-semibold text-accent-ink backdrop-blur">
          <Layers className="h-3 w-3" strokeWidth={2} /> To'plam
        </span>

        {soldOut ? (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-surface/85 px-2.5 py-0.5 text-2xs font-semibold text-muted backdrop-blur">
            <PackageOpen className="h-3 w-3" strokeWidth={1.75} /> Tugagan
          </span>
        ) : (
          <span className="absolute bottom-3 left-3 rounded-full bg-surface/85 px-2.5 py-0.5 text-2xs font-semibold text-text backdrop-blur">
            {combo.available} to'plam
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`truncate text-sm font-semibold ${soldOut ? 'text-muted' : 'text-text'}`}>{name}</p>
            <p className="truncate text-xs text-muted">{combo.items.length} ta mahsulot</p>
          </div>
          <Badge tone={combo.status === 'active' ? 'success' : 'muted'}>{productStatusLabels[combo.status]}</Badge>
        </div>

        {/* component thumbnails */}
        <div className="mb-2 flex items-center gap-1.5">
          {combo.items.slice(0, 4).map((it) => (
            <span key={it.combo_item_id} className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
              {it.image_url ? (
                <img src={it.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center"><Layers className="h-3.5 w-3.5 text-muted/60" strokeWidth={1.5} /></span>
              )}
            </span>
          ))}
          {combo.items.length > 4 && (
            <span className="tnum text-2xs text-muted">+{combo.items.length - 4}</span>
          )}
        </div>

        <span className={`flex items-baseline gap-1.5 text-md tnum ${soldOut ? 'text-muted' : 'text-accent-ink'}`}>
          <Money short value={combo.price} />
          {discounted && <span className="text-2xs text-muted line-through"><Money short value={combo.old_price!} /></span>}
        </span>
      </div>
    </div>
  );
}

/** Read-only combo detail. */
function ComboView({ combo, name }: { combo: ComboOut; name: string }) {
  const discounted = combo.old_price != null;
  return (
    <div className="space-y-5">
      {combo.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {combo.images.map((src, i) => (
            <img key={src + i} src={src} alt="" className="h-40 w-40 shrink-0 rounded-2xl border border-border object-cover" />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={combo.status === 'active' ? 'success' : 'muted'}>{productStatusLabels[combo.status]}</Badge>
        <Badge tone={combo.available > 0 ? 'muted' : 'danger'}>{combo.available} to'plam mavjud</Badge>
      </div>
      <div>
        <p className="text-lg font-semibold text-text">{name}</p>
        <p className="mt-2 flex items-baseline gap-2 text-xl tnum text-accent-ink">
          <Money value={combo.price} />
          {discounted && <span className="text-sm text-muted line-through"><Money value={combo.old_price!} /></span>}
        </p>
        {combo.description_uz && <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{combo.description_uz}</p>}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Tarkibi</p>
        <div className="space-y-2">
          {combo.items.map((it) => (
            <div key={it.combo_item_id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
                {it.image_url ? <img src={it.image_url} alt="" className="h-full w-full object-cover" /> : <Layers className="h-4 w-4 text-muted" strokeWidth={1.5} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{it.name_uz}</p>
                <p className="text-2xs text-muted">{it.available} dona mavjud</p>
              </div>
              <span className="tnum text-sm text-muted">{it.quantity}×</span>
              <span className="tnum text-sm text-accent-ink"><Money short value={it.price} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CombosPage() {
  const navigate = useNavigate();
  const lang = useUiStore((s) => s.lang);
  const deleteCombo = useDeleteCombo();

  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  useEffect(() => setOffset(0), [debouncedQ, status]);

  const query = useCombos({
    limit: PAGE_SIZE,
    offset,
    q: debouncedQ || undefined,
    status: (status as ComboOut['status']) || undefined,
  });
  const combos = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ComboOut | undefined>();
  const [viewing, setViewing] = useState<ComboOut | undefined>();
  const [deleting, setDeleting] = useState<ComboOut | undefined>();
  const hasFilters = Boolean(debouncedQ || status);

  return (
    <div>
      <PageHeader
        heading="To'plamlar"
        subheading="Turli kategoriyalardan yig'ilgan sovg'a to'plamlari"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/products')}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Mahsulotlar
            </Button>
            <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Yangi to'plam
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nomi bo'yicha qidirish..."
            aria-label="To'plam qidirish"
            className="w-full rounded-xl border border-border bg-surface-2 py-2.5 px-4 text-sm text-text placeholder:text-muted focus:border-accent"
          />
        </div>
        <div className="w-44">
          <Select placeholder="Holat" options={statusFilterOptions} value={status} onChange={setStatus} />
        </div>
      </div>

      {query.isPending && <SkeletonCards count={8} />}
      {query.isError && <ErrorCard error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && combos.length === 0 && (
        <Card>
          <EmptyState
            heading={hasFilters ? 'Hech narsa topilmadi' : "To'plam hali yo'q"}
            hint={hasFilters ? "Filtrlarni o'zgartiring" : 'Bir necha mahsulotni bitta sovg\'a to\'plamiga birlashtiring'}
            action={!hasFilters ? (
              <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>To'plam qo'shish</Button>
            ) : undefined}
          />
        </Card>
      )}
      {query.isSuccess && combos.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {combos.map((c) => (
              <ComboCard
                key={c.id}
                combo={c}
                name={pickName(c, lang)}
                onEdit={() => { setEditing(c); setFormOpen(true); }}
                onDelete={() => setDeleting(c)}
                onView={() => setViewing(c)}
              />
            ))}
          </div>
          <Pager offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        heading={editing ? "To'plamni tahrirlash" : "Yangi to'plam"}
        wide
      >
        <ComboForm combo={editing} onDone={() => setFormOpen(false)} />
      </Modal>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(undefined)} heading={viewing ? pickName(viewing, lang) : ''} wide>
        {viewing && <ComboView combo={viewing} name={pickName(viewing, lang)} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        heading="To'plamni o'chirish"
        description={`«${deleting ? pickName(deleting, lang) : ''}» butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteCombo.mutateAsync(deleting.id);
          toast.success("O'chirildi");
          setDeleting(undefined);
        }}
      />
    </div>
  );
}
