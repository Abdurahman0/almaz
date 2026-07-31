import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Gem, Instagram } from 'lucide-react';
import { Button, ImageUpload, Input, Select, toast, type SelectOption } from '@/shared/ui';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { ApiError } from '@/shared/api/client';
import type { ProductOut } from '@/shared/api/types';
import { useProducts } from '@/features/products/hooks';
import { useAddSocial } from '../hooks';
import { deriveKind, kindLabel, type SocialKind } from '../api';

const KINDS: SocialKind[] = ['post', 'reel', 'story'];
const linkHint: Record<SocialKind, string> = {
  post: 'https://www.instagram.com/p/...',
  reel: 'https://www.instagram.com/reel/...',
  story: 'https://www.instagram.com/stories/.../',
};

const schema = z.object({
  productId: z.string().uuid('Mahsulotni tanlang'),
  kind: z.enum(['post', 'reel', 'story']),
  link: z.string().trim().min(1, 'Havola kiritilishi shart'),
  imageUrl: z.string(),
});
type FormValues = z.infer<typeof schema>;

/**
 * Content (Instagram media) create form. Two entry points share it:
 *   - product detail → `product` is locked (its photo pre-fills the image, and a
 *     thumbnail strip lets the user pick among the product's photos).
 *   - social page → `product` is undefined → a searchable product picker.
 * The backend derives the type/ref from the link; the image is a plain URL, so a
 * product photo is reused directly (no re-upload).
 *
 * `onSaved` fires after a successful save (parent returns to the product detail);
 * `onCancel` is the explicit "Bekor qilish" (parent decides whether to confirm a
 * dirty form); `onDirtyChange` lets the parent drive an unsaved-changes guard.
 */
export function ContentForm({
  product,
  onSaved,
  onCancel,
  onDirtyChange,
}: {
  product?: ProductOut;
  onSaved: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const lang = useUiStore((s) => s.lang);
  const products = useProducts();
  const add = useAddSocial();

  const productImages = useMemo(
    () => (product?.media ?? []).map((m) => m.image_url).filter((u): u is string => Boolean(u)),
    [product],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: product?.id ?? '',
      kind: 'post',
      link: '',
      imageUrl: productImages[0] ?? '',
    },
    mode: 'onChange',
  });

  const kind = form.watch('kind');
  const link = form.watch('link');
  const imageUrl = form.watch('imageUrl');

  // Report dirtiness so the parent can guard an in-place back with a confirm.
  const isDirty = form.formState.isDirty;
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);
  const linkKind: SocialKind | null = link.trim() ? deriveKind(link) : null;
  const kindMismatch = Boolean(linkKind && linkKind !== kind);

  const productOptions: SelectOption[] = (products.data ?? []).map((p) => ({ value: p.id, label: pickName(p, lang) }));

  const submit = form.handleSubmit((v) => {
    add.mutate(
      { productId: v.productId, body: { link: v.link.trim(), image_url: v.imageUrl.trim() || null } },
      {
        onSuccess: () => { onDirtyChange?.(false); toast.success("Kontent qo'shildi"); onSaved(); },
        onError: (e) => toast.error((e as unknown as ApiError).message || "Havola qo'shishda xatolik"),
      },
    );
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Content type */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Kontent turi</p>
        <div className="flex gap-1 rounded-[var(--r-sm)] bg-surface-2 p-0.5">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => form.setValue('kind', k)}
              className={`flex-1 rounded-[var(--r-xs)] py-1.5 text-xs font-semibold transition-colors ${
                kind === k ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text'
              }`}
            >
              {kindLabel[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Product — locked chip (content can't be unlinked) or searchable picker */}
      {product ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Mahsulot</p>
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/50 py-1 pl-1 pr-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
              {productImages[0] ? (
                <img src={productImages[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <Gem className="h-3.5 w-3.5 text-muted/60" strokeWidth={1.25} />
              )}
            </span>
            <span className="truncate text-sm font-medium text-accent-ink">{pickName(product, lang)}</span>
          </span>
        </div>
      ) : (
        <Controller
          control={form.control}
          name="productId"
          render={({ field, fieldState }) => (
            <Select
              label="Mahsulot"
              placeholder="Mahsulotni tanlang"
              options={productOptions}
              value={field.value}
              onChange={field.onChange}
              searchable
              disabled={products.isPending}
              error={fieldState.error?.message}
            />
          )}
        />
      )}

      {/* Link */}
      <div>
        <Input
          label={`${kindLabel[kind]} havolasi`}
          placeholder={linkHint[kind]}
          error={form.formState.errors.link?.message}
          {...form.register('link')}
        />
        {kindMismatch && !form.formState.errors.link && (
          <p className="mt-1.5 text-2xs text-danger">
            Havola «{kindLabel[linkKind!]}» ga o'xshaydi — tur havoladan aniqlanadi.
          </p>
        )}
      </div>

      {/* Image — prefilled from the product; replaceable, and pickable from the strip */}
      <div className="space-y-2">
        <ImageUpload
          label="Rasm"
          value={imageUrl || null}
          onChange={(url) => form.setValue('imageUrl', url ?? '')}
        />
        {productImages.length > 1 && (
          <div>
            <p className="mb-1.5 text-2xs text-muted">Mahsulot rasmlaridan tanlang</p>
            <div className="flex flex-wrap gap-2">
              {productImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => form.setValue('imageUrl', url)}
                  className={`h-12 w-12 overflow-hidden rounded-[var(--r-sm)] border-2 transition-colors ${
                    imageUrl === url ? 'border-accent' : 'border-transparent hover:border-strong'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="flex items-center gap-1.5 text-2xs text-muted">
          <Instagram className="h-3 w-3" strokeWidth={1.75} />
          Instagram rasmni avtomatik olib kelmaydi — lentada ko'rinishi uchun rasm kerak.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Bekor qilish</Button>
        <Button type="submit" loading={add.isPending}>Qo'shish</Button>
      </div>
    </form>
  );
}
