import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadFile, UPLOAD_ACCEPT } from '@/shared/api/files';
import { toast } from './toast';

interface ImageUploadProps {
  /** Current image URL (or null when empty). */
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  disabled?: boolean;
  /** Aspect of the preview + dropzone. */
  aspect?: 'video' | 'square';
}

/**
 * Single-image field: ONE control that both accepts a drag-and-dropped file and
 * opens the file picker on click — never a URL text box. Uploads via POST /files
 * and returns the hosted URL. Shows a preview with a remove button once set.
 */
export function ImageUpload({ value, onChange, label, disabled, aspect = 'video' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const up = await uploadFile(file);
      onChange(up.url);
    } catch {
      toast.error('Rasm yuklashda xatolik');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const ar = aspect === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div className="space-y-1.5">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      {value ? (
        <div className={`relative w-full max-w-[240px] overflow-hidden rounded-[var(--r-md)] border border-border ${ar}`}>
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Rasmni olib tashlash"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
          className={`flex w-full flex-col items-center gap-1.5 rounded-[var(--r-md)] border border-dashed p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-wait ${
            over ? 'border-accent bg-accent-soft' : 'border-strong hover:border-accent'
          }`}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted" strokeWidth={1.5} />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted" strokeWidth={1.5} />
          )}
          <span className="text-xs text-muted">
            {busy ? 'Yuklanmoqda…' : 'Rasm tashlang yoki tanlash uchun bosing'}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
