import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from 'lucide-react';
import { uploadFile } from '@/shared/api/files';
import { toast } from '@/shared/ui';
import { ImageCropDialog } from './ImageCropDialog';

// Product images are pictures only (no pdf) — jpg/jpeg/png/webp/gif/heic.
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.heic';

interface Uploading {
  id: number;
  name: string;
  pct: number;
}

/**
 * Multi-image manager for the product form. Drag-and-drop OR file picker, uploads
 * each file to POST /files with a per-file progress bar, shows thumbnail previews,
 * and supports remove + (optional) reorder. Uploading never blocks the rest of the
 * form. The first image is the primary/cover.
 */
export function ProductImages({
  urls,
  onUploaded,
  onRemove,
  onReorder,
  error,
  required,
  disabled,
}: {
  urls: string[];
  onUploaded: (url: string) => void;
  onRemove: (index: number) => void;
  /** Provide to enable ‹ › reordering (create flow — order becomes image_urls). */
  onReorder?: (from: number, to: number) => void;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const nextId = useRef(0);

  // Selecting files opens the crop dialog (one at a time) so the user frames the
  // square shown in the CRM before the file is uploaded.
  const enqueue = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCropQueue((q) => [...q, ...Array.from(files)]);
    if (inputRef.current) inputRef.current.value = '';
  };
  const dequeue = () => setCropQueue((q) => q.slice(1));

  const uploadOne = (file: File) => {
    const id = nextId.current++;
    setUploading((u) => [...u, { id, name: file.name, pct: 0 }]);
    uploadFile(file, (pct) => setUploading((u) => u.map((x) => (x.id === id ? { ...x, pct } : x))))
      .then((res) => onUploaded(res.url))
      .catch(() => toast.error(`«${file.name}» yuklanmadi`))
      .finally(() => setUploading((u) => u.filter((x) => x.id !== id)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-medium ${error ? 'text-danger' : 'text-muted'}`}>
          Rasmlar {required && <span className="text-danger">*</span>}
        </span>
        {error && <span className="text-2xs text-danger">— kamida bitta rasm shart</span>}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {urls.map((url, i) => (
          <div
            key={url + i}
            className={`group relative h-24 w-24 overflow-hidden rounded-[var(--r-md)] border ${
              i === 0 ? 'border-accent' : 'border-border'
            }`}
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-0 top-0 rounded-br-[var(--r-xs)] bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Asosiy
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label="Rasmni olib tashlash"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            {onReorder && urls.length > 1 && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => onReorder(i, i - 1)}
                  aria-label="Chapga"
                  className="flex h-6 flex-1 items-center justify-center text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  disabled={i === urls.length - 1}
                  onClick={() => onReorder(i, i + 1)}
                  aria-label="O'ngga"
                  className="flex h-6 flex-1 items-center justify-center text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* in-flight uploads with progress */}
        {uploading.map((u) => (
          <div
            key={u.id}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-border bg-surface-2 px-2"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted" strokeWidth={1.5} />
            <div className="h-1 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${u.pct}%` }} />
            </div>
            <span className="tnum text-2xs text-muted">{u.pct}%</span>
          </div>
        ))}

        {/* add tile / dropzone */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            enqueue(e.dataTransfer.files);
          }}
          className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-[var(--r-md)] border border-dashed text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
            over ? 'border-accent bg-accent-soft' : error ? 'border-danger' : 'border-strong hover:border-accent'
          }`}
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-2xs">Rasm qo'shish</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => enqueue(e.target.files)}
      />

      {cropQueue.length > 0 && (
        <ImageCropDialog
          file={cropQueue[0]}
          onCancel={dequeue}
          onDone={(f) => { uploadOne(f); dequeue(); }}
        />
      )}
    </div>
  );
}
