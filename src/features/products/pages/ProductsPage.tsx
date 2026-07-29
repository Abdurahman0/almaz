import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, SlidersHorizontal, Search, AlertTriangle, Gift, Gem, Layers, LayoutGrid, Rows3, Copy, Eye } from 'lucide-react';
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
  toast,
  type SelectOption,
} from '@/shared/ui';
import { CatalogCard } from '../components/CatalogCard';
import { useCategories, useDeleteProduct, useDuplicateProduct, useLowStock, useProductsPage, useRefs } from '../hooks';
import { useLowStockThreshold } from '@/features/settings/hooks';
import { ProductForm } from '../components/ProductForm';
import { CatalogManager } from '../components/CatalogManager';
import { BoxManager } from '../components/CategoryBoxes';
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

const productMenuItems = (a: { onView: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) => [
  { label: "Ko'rish", icon: <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: a.onView },
  { label: 'Tahrirlash', icon: <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: a.onEdit },
  { label: 'Nusxalash', icon: <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: a.onDuplicate },
  { label: "O'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: a.onDelete, destructive: true, separatorBefore: true },
];

/** Product status → badge, but ONLY for non-normal states (active shows none). */
function productStatusBadge(status: ProductStatus): { label: string; tone: 'muted' | 'danger' | 'success' } | null {
  if (status === 'active') return null;
  return { label: productStatusLabels[status], tone: 'muted' };
}

function ProductSlot({ product, name, material, stone, lowStock, onEdit, onDelete, onView, onDuplicate }: {
  product: ProductOut;
  name: string;
  material: string;
  stone: string;
  lowStock: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onDuplicate: () => void;
}) {
  // Only jeweler facts the API actually returns; weight + ring size are not on
  // ProductOut (docs/API-GAPS.md) so they're omitted rather than shown as "—".
  const meta = [material, stone, `${product.variants.length} variant`].filter(Boolean);
  return (
    <CatalogCard
      imageUrl={product.media[0]?.image_url}
      placeholderIcon={<Gem className="h-8 w-8 text-muted/45" strokeWidth={1.25} />}
      name={name}
      price={product.effective_price}
      oldPrice={product.discount_price != null ? product.price : null}
      meta={meta}
      available={product.available}
      lowStock={lowStock}
      statusBadge={productStatusBadge(product.status)}
      menuItems={productMenuItems({ onView, onEdit, onDuplicate, onDelete })}
      onClick={onView}
    />
  );
}

/** Read-only product detail shown when a card is clicked. */
function ProductView({
  product,
  name,
  meta,
  onEdit,
}: {
  product: ProductOut;
  name: string;
  meta: string;
  onEdit: () => void;
}) {
  const discounted = product.discount_price != null;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2">
          {product.media[0]?.image_url ? (
            <img src={product.media[0].image_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Gem className="h-12 w-12 text-muted/50" strokeWidth={1.25} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={product.status === 'active' ? 'success' : 'muted'}>
              {productStatusLabels[product.status]}
            </Badge>
            <Badge tone={product.available > 0 ? 'muted' : 'danger'}>{product.available} dona mavjud</Badge>
          </div>
          <p className="text-lg font-semibold text-text">{name}</p>
          {meta && <p className="text-sm text-muted">{meta}</p>}
          <p className="mt-3 flex items-baseline gap-2 text-xl tnum text-accent-ink">
            <Money value={product.effective_price} />
            {discounted && (
              <span className="text-sm text-muted line-through">
                <Money value={product.price} />
              </span>
            )}
          </p>
          {product.engraving_available && (
            <p className="mt-2 text-xs text-muted">Gravirovka mavjud</p>
          )}
          {(product.description_uz || product.description_ru) && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted">
              {product.description_uz || product.description_ru}
            </p>
          )}
        </div>
      </div>

      {product.variants.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Variantlar</p>
          <div className="overflow-hidden rounded-xl border border-border">
            {product.variants.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm first:border-t-0"
              >
                <span className="font-mono text-xs text-text">{v.sku}</span>
                <span className="tnum text-muted">{v.available} dona</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onEdit}>
          <Pencil className="h-4 w-4" strokeWidth={1.5} /> Tahrirlash
        </Button>
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

interface RowActions {
  onView: (p: ProductOut) => void;
  onEdit: (p: ProductOut) => void;
  onDuplicate: (p: ProductOut) => void;
  onDelete: (p: ProductOut) => void;
}

/** Dense table view — thumbnail, name, material, stone, price, stock, status. */
function ProductTable({
  products, materials, stones, lang, isLow, lowStockOnly, actions,
}: {
  products: ProductOut[];
  materials: Map<string, RefOut>;
  stones: Map<string, RefOut>;
  lang: 'uz' | 'ru';
  isLow: (p: ProductOut) => boolean;
  lowStockOnly: boolean;
  actions: RowActions;
}) {
  const refName = (map: Map<string, RefOut>, id: string | null) => (id ? pickName(map.get(id), lang) : '');
  return (
    <Card className="overflow-x-auto p-0">
      <table className="data-table min-w-[760px]">
        <thead>
          <tr>
            <th className="w-[56px]"></th>
            <th>Nomi</th>
            <th>Material</th>
            <th>Tosh</th>
            <th className="!text-right">Narx</th>
            <th className="!text-right">Zaxira</th>
            <th>Holat</th>
            <th className="w-[44px]"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const soldOut = p.available <= 0;
            const low = lowStockOnly || isLow(p);
            return (
              <tr key={p.id} className="cursor-pointer" onClick={() => actions.onView(p)}>
                <td>
                  <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-border bg-surface-2">
                    {p.media[0]?.image_url ? (
                      <img src={p.media[0].image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Gem className="h-4 w-4 text-muted/50" strokeWidth={1.25} />
                    )}
                  </span>
                </td>
                <td><span className="font-medium text-text">{pickName(p, lang)}</span></td>
                <td className="text-muted">{refName(materials, p.material_id) || '—'}</td>
                <td className="text-muted">{refName(stones, p.stone_id) || '—'}</td>
                <td className="text-right">
                  <span className="tnum font-semibold text-accent-ink"><Money short value={p.effective_price} /></span>
                  {p.discount_price != null && (
                    <span className="ml-1 text-2xs text-muted line-through"><Money short value={p.price} /></span>
                  )}
                </td>
                <td className={`tnum text-right ${soldOut ? 'text-muted' : low ? 'text-danger' : 'text-text'}`}>
                  {p.available}
                </td>
                <td>
                  <Badge tone={p.status === 'active' ? 'success' : 'muted'}>{productStatusLabels[p.status]}</Badge>
                </td>
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu
                    items={productMenuItems({
                      onView: () => actions.onView(p),
                      onEdit: () => actions.onEdit(p),
                      onDuplicate: () => actions.onDuplicate(p),
                      onDelete: () => actions.onDelete(p),
                    })}
                    trigger={
                      <button aria-label="Amallar" className="rounded p-1.5 text-muted transition-colors hover:text-text">
                        <span className="text-lg leading-none">⋯</span>
                      </button>
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const lang = useUiStore((s) => s.lang);
  const view = useUiStore((s) => s.productView);
  const setView = useUiStore((s) => s.setProductView);
  const deleteProduct = useDeleteProduct();
  const duplicate = useDuplicateProduct();
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
  const [boxesOpen, setBoxesOpen] = useState(false);
  const [editing, setEditing] = useState<ProductOut | undefined>();
  const [deleting, setDeleting] = useState<ProductOut | undefined>();
  const [viewing, setViewing] = useState<ProductOut | undefined>();

  const refName = (map: Map<string, RefOut>, id: string | null) =>
    id ? pickName(map.get(id), lang) : '';
  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Barcha kategoriyalar' },
    ...(categories.data ?? []).map((c) => ({ value: c.id, label: pickName(c, lang) })),
  ];
  const hasFilters = Boolean(debouncedQ || status || categoryId || inStock || lowStockOnly);

  const onDuplicate = (p: ProductOut) =>
    duplicate.mutate(p, {
      onSuccess: () => toast.success('Nusxalandi'),
      onError: () => toast.error('Nusxalashda xatolik'),
    });
  const rowActions: RowActions = {
    onView: (p) => setViewing(p),
    onEdit: (p) => { setEditing(p); setFormOpen(true); },
    onDuplicate,
    onDelete: (p) => setDeleting(p),
  };

  return (
    <div>
      <PageHeader
        heading="Mahsulotlar"
        subheading="Baxmal patnisdagi kolleksiya"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/combos')}>
              <Layers className="h-4 w-4" strokeWidth={1.5} /> To'plamlar
            </Button>
            <Button variant="secondary" onClick={() => setBoxesOpen(true)}>
              <Gift className="h-4 w-4" strokeWidth={1.5} /> Sovg'a qutilari
            </Button>
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
            className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-accent disabled:opacity-45"
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

        <div className="ml-auto flex rounded-[var(--r-sm)] bg-surface-2 p-0.5">
          <button
            onClick={() => setView('grid')}
            aria-label="Katakcha ko'rinishi"
            aria-pressed={view === 'grid'}
            className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-xs)] transition-colors ${view === 'grid' ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text'}`}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setView('table')}
            aria-label="Jadval ko'rinishi"
            aria-pressed={view === 'table'}
            className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-xs)] transition-colors ${view === 'table' ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text'}`}
          >
            <Rows3 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
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
          {view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  onView={() => setViewing(p)}
                  onDuplicate={() => onDuplicate(p)}
                />
              ))}
            </div>
          ) : (
            <ProductTable
              products={products}
              materials={materials}
              stones={stones}
              lang={lang}
              isLow={isLow}
              lowStockOnly={lowStockOnly}
              actions={rowActions}
            />
          )}
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

      <Modal open={boxesOpen} onClose={() => setBoxesOpen(false)} heading="Sovg'a qutilari" wide>
        <BoxManager />
      </Modal>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(undefined)}
        heading={viewing ? pickName(viewing, lang) : ''}
        wide
      >
        {viewing && (
          <ProductView
            product={viewing}
            name={pickName(viewing, lang)}
            meta={[refName(materials, viewing.material_id), refName(stones, viewing.stone_id)].filter(Boolean).join(' · ')}
            onEdit={() => {
              setEditing(viewing);
              setViewing(undefined);
              setFormOpen(true);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        heading="Mahsulotni o'chirish"
        description={`«${deleting ? pickName(deleting, lang) : ''}» butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteProduct.mutateAsync(deleting.id);
          toast.success("Mahsulot o'chirildi");
          setDeleting(undefined);
        }}
      />
    </div>
  );
}
