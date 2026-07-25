import { useEffect, useMemo, useState } from 'react';
import { Plus, PackageOpen, Pencil, Trash2, SlidersHorizontal, Search, AlertTriangle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorCard,
  Modal,
  PageHeader,
  Pager,
  Select,
  SkeletonCards,
  Money,
  productStatusLabels,
  ConfirmDialog,
  DropdownMenu,
  Tooltip,
  toast,
  type SelectOption,
} from '@/shared/ui';
import { useCategories, useDeleteProduct, useLowStock, useProductsPage, useRefs } from '../hooks';
import { useLowStockThreshold } from '@/features/settings/hooks';
import { ProductForm } from '../components/ProductForm';
import { CatalogManager } from '../components/CatalogManager';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { ProductOut, ProductStatus, RefOut } from '@/shared/api/types';

const PAGE_SIZE = 24;
const statusFilterOptions: SelectOption[] = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'active', label: 'Faol' },
  { value: 'draft', label: 'Qoralama' },
  { value: 'archived', label: 'Arxiv' },
];

function ProductSlot({ product, name, material, stone, lowStock, onEdit, onDelete }: {
  product: ProductOut;
  name: string;
  material: string;
  stone: string;
  lowStock: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // available comes straight from the API (active stocked variants, stock-reserved)
  const stock = product.available;
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
        <span
          className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold ${
            lowStock ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-ink'
          }`}
        >
          {lowStock && <AlertTriangle className="h-3 w-3" strokeWidth={2} />}
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
  const deleteProduct = useDeleteProduct();
  const materials = useRefMap('materials');
  const stones = useRefMap('stones');
  const categories = useCategories();

  const globalThreshold = useLowStockThreshold();

  // filters
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [inStock, setInStock] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  // any filter change resets to the first page
  useEffect(() => setOffset(0), [debouncedQ, status, categoryId, inStock, lowStockOnly]);

  // low-stock mode swaps the data source to the dedicated endpoint; only the
  // active source fetches
  const fullQuery = useProductsPage(
    {
      limit: PAGE_SIZE,
      offset,
      q: debouncedQ || undefined,
      status: (status as ProductStatus) || undefined,
      category_id: categoryId || undefined,
      in_stock: inStock || undefined,
    },
    !lowStockOnly,
  );
  const lowQuery = useLowStock(
    { limit: PAGE_SIZE, offset, status: (status as ProductStatus) || undefined },
    lowStockOnly,
  );
  const query = lowStockOnly ? lowQuery : fullQuery;
  const products = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const isLow = (p: ProductOut) => {
    const threshold = p.low_stock_threshold ?? globalThreshold;
    return p.available < threshold;
  };

  const [formOpen, setFormOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductOut | undefined>();
  const [deleting, setDeleting] = useState<ProductOut | undefined>();

  const refName = (map: Map<string, RefOut>, id: string | null) =>
    id ? pickName(map.get(id), lang) : '';
  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Barcha kategoriyalar' },
    ...(categories.data ?? []).map((c) => ({ value: c.id, label: pickName(c, lang) })),
  ];
  const hasFilters = Boolean(debouncedQ || status || categoryId || inStock || lowStockOnly);

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

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nomi bo'yicha qidirish (uz/ru)..."
            aria-label="Mahsulot qidirish"
            disabled={lowStockOnly}
            className="w-full rounded-lg border border-border bg-bg py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-accent disabled:opacity-45"
          />
        </div>
        <div className="w-44">
          <Select placeholder="Kategoriya" options={categoryOptions} value={categoryId} onChange={setCategoryId} disabled={lowStockOnly} />
        </div>
        <div className="w-40">
          <Select placeholder="Holat" options={statusFilterOptions} value={status} onChange={setStatus} />
        </div>
        <Checkbox checked={inStock} onCheckedChange={setInStock} label="Faqat mavjud" disabled={lowStockOnly} />
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            lowStockOnly
              ? 'border-danger bg-danger-soft text-danger'
              : 'border-border text-muted hover:border-strong hover:text-text'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} /> Kam qolganlar
        </button>
      </div>

      {query.isPending && <SkeletonCards count={8} />}
      {query.isError && <ErrorCard error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && products.length === 0 && (
        <Card>
          <EmptyState
            heading={lowStockOnly ? 'Kam qolgan mahsulot yo\'q' : hasFilters ? 'Hech narsa topilmadi' : "Patnis hali bo'sh"}
            hint={lowStockOnly ? 'Zaxira yetarli' : hasFilters ? "Filtrlarni o'zgartiring" : 'Birinchi taqinchoqni qo\'shing — patnis yaltirasin'}
            action={
              !hasFilters ? (
                <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
                  Mahsulot qo'shish
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}
      {query.isSuccess && products.length > 0 && (
        <>
          <Card className="bg-surface p-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductSlot
                  key={p.id}
                  product={p}
                  name={pickName(p, lang)}
                  material={refName(materials, p.material_id)}
                  stone={refName(stones, p.stone_id)}
                  lowStock={lowStockOnly || isLow(p)}
                  onEdit={() => { setEditing(p); setFormOpen(true); }}
                  onDelete={() => setDeleting(p)}
                />
              ))}
            </div>
          </Card>
          <Pager offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
        </>
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
