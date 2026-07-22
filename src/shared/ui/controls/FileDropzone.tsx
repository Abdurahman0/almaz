import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  label?: string;
}

/** Dashed drop zone with drag-over accent state and thumbnail previews. */
export function FileDropzone({ files, onChange, accept = 'image/*', label }: FileDropzoneProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    onChange([...files, ...Array.from(list)]);
  };

  return (
    <div className="space-y-2">
      {label && (
        <span className="text-2xs font-semibold uppercase tracking-caps text-muted">{label}</span>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={`flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
          over ? 'border-accent bg-accent-soft' : 'border-strong hover:border-accent'
        }`}
      >
        <ImagePlus className="h-6 w-6 text-muted" strokeWidth={1.5} />
        <span className="text-sm text-muted">Rasm tashlang yoki tanlang</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={f.name + i} className="relative">
              <img
                src={URL.createObjectURL(f)}
                alt={f.name}
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                aria-label={`${f.name} olib tashlash`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-danger"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
