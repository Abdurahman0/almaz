import { useMemo, useState } from 'react';
import { Plus, PackageOpen, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorCard,
  Modal,
  PageHeader,
  SkeletonCards,
  Money,
  productStatusLabels,
  ConfirmDialog,
  DropdownMenu,
  Tooltip,
  toast,
} from '@/shared/ui';
import { useDeleteProduct, useProducts, useRefs } from '../hooks';
import { ProductForm } from '../components/ProductForm';
import { CatalogManager } from '../components/CatalogManager';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { ProductOut, RefOut } from '@/shared/api/types';

function ProductSlot({ product, name, material, stone, onEdit, onDelete }: {
  product: ProductOut;
  name: string;
  material: string;
  stone: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stock = product.variants.reduce((sum, v) => sum + v.available, 0);
  const soldOut = stock <= 0;
  const discounted = product.discount_price != null;

  return (
    <div
      className={`group relative rounded-xl p-5 transition-all duration-300 ${
        soldOut
          ? 'border border-border opacity-60'
          : 'border border-border bg-bg hover:-translate-y-0.5 hover:border-strong'
      }`}
    >
      <span className="absolute right-2 top-2 z-10">
        {soldOut ? (
          <Tooltip content="Qayta buyurtma berasizmi?">
            <span>
              <DropdownMenu
                items={[
                  { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: onEdit },
                  { label: "O'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: onDelete, destructive: true, separatorBefore: true },
                ]}
              />
            </span>
          </Tooltip>
        ) : (
          <DropdownMenu
            items={[
              { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: onEdit },
              { label: "O'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: onDelete, destructive: true, separatorBefore: true },
            ]}
          />
        )}
      </span>
      {!soldOut && (
        <span className="absolute left-3 top-3 rounded-full bg-accent-soft px-2 py-0.5 text-2xs font-bold text-accent-ink">
          {stock} dona
        </span>
      )}
      <div className="flex h-24 items-center justify-center">
        {soldOut ? (
          <PackageOpen className="h-10 w-10 text-muted" strokeWidth={1} />
        ) : product.media[0]?.image_url ? (
          <img
            src={product.media[0].image_url}
            alt={name}
            className="h-24 w-24 rounded-xl object-cover"
          />
        ) : (
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
            <circle cx="36" cy="42" r="18" fill="none" stroke="var(--accent)" strokeWidth="5" />
            <path d="M36 8 l8 9 -8 10 -8 -10 z" fill="var(--accent)" opacity="0.7" />
          </svg>
        )}
      </div>
      <p className={`mt-3 truncate text-sm font-semibold ${soldOut ? 'text-muted' : 'text-text'}`}>
        {name}
      </p>
      <p className="truncate text-xs text-muted">
        {[material, stone].filter(Boolean).join(' · ') || '—'}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className={`flex items-baseline gap-1.5 text-md tnum ${soldOut ? 'text-muted' : 'text-accent-ink'}`}>
          <Money short value={product.effective_price} />
          {discounted && (
            <span className="text-2xs text-muted line-through">
              <Money short value={product.price} />
            </span>
          )}
        </span>
        <Badge tone={product.status === 'active' ? 'success' : 'muted'}>
          {productStatusLabels[product.status]}
        </Badge>
      </div>
    </div>
  );
}

function useRefMap(kind: 'materials' | 'stones' | 'genders') {
  const q = useRefs(kind, false);
  return useMemo(() => {
    const m = new Map<string, RefOut>();
    (q.data ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [q.data]);
}

export default function ProductsPage() {
  const lang = useUiStore((s) => s.lang);
  const query = useProducts();
  const deleteProduct = useDeleteProduct();
  const materials = useRefMap('materials');
  const stones = useRefMap('stones');
  const [formOpen, setFormOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductOut | undefined>();
  const [deleting, setDeleting] = useState<ProductOut | undefined>();

  const refName = (map: Map<string, RefOut>, id: string | null) =>
    id ? pickName(map.get(id), lang) : '';

  return (
    <div>
      <PageHeader
        heading="Mahsulotlar"
        subheading="Baxmal patnisdagi kolleksiya"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCatalogOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} /> Katalog sozlamalari
            </Button>
            <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Yangi mahsulot
            </Button>
          </div>
        }
      />

      {query.isPending && <SkeletonCards count={8} />}
      {query.isError && <ErrorCard error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && query.data.length === 0 && (
        <Card>
          <EmptyState
            heading="Patnis hali bo'sh"
            hint="Birinchi taqinchoqni qo'shing — patnis yaltirasin"
            action={
              <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
                Mahsulot qo'shish
              </Button>
            }
          />
        </Card>
      )}
      {query.isSuccess && query.data.length > 0 && (
        <Card className="bg-surface p-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {query.data.map((p) => (
              <ProductSlot
                key={p.id}
                product={p}
                name={pickName(p, lang)}
                material={refName(materials, p.material_id)}
                stone={refName(stones, p.stone_id)}
                onEdit={() => { setEditing(p); setFormOpen(true); }}
                onDelete={() => setDeleting(p)}
              />
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        heading={editing ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
        wide
      >
        <ProductForm product={editing} onDone={() => setFormOpen(false)} />
      </Modal>

      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} heading="Katalog sozlamalari" wide>
        <CatalogManager />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        heading="O'chirishni tasdiqlang"
        description={`«${deleting ? pickName(deleting, lang) : ''}» mahsuloti butunlay o'chiriladi — bu amalni ortga qaytarib bo'lmaydi.`}
        loading={deleteProduct.isPending}
        onConfirm={() =>
          deleting &&
          deleteProduct.mutate(deleting.id, {
            onSuccess: () => { setDeleting(undefined); toast.success("Mahsulot o'chirildi"); },
            onError: () => toast.error("O'chirishda xatolik yuz berdi"),
          })
        }
      />
    </div>
  );
}
