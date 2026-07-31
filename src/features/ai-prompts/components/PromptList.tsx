import { Search } from 'lucide-react';
import { Badge } from '@/shared/ui';
import type { AiPromptOut } from '../types';
import { GROUP_LABELS, GROUP_ORDER, groupOf, promptName } from '../lib';

export function PromptList({
  prompts,
  selectedKey,
  onSelect,
  search,
  setSearch,
  onlyOverridden,
  setOnlyOverridden,
}: {
  prompts: AiPromptOut[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onlyOverridden: boolean;
  setOnlyOverridden: (v: boolean) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = prompts.filter((p) => {
    if (onlyOverridden && !p.is_overridden) return false;
    if (!q) return true;
    return p.key.toLowerCase().includes(q) || p.purpose.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2.5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kalit yoki tavsif bo'yicha qidirish..."
            aria-label="Promt qidirish"
            className="w-full rounded-[var(--r-md)] border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-muted focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyOverridden(!onlyOverridden)}
          aria-pressed={onlyOverridden}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            onlyOverridden ? 'border-accent bg-accent-soft text-accent-ink' : 'border-border text-muted hover:border-strong hover:text-text'
          }`}
        >
          Faqat tahrirlanganlar
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="px-1 py-8 text-center text-sm text-muted">Hech narsa topilmadi</p>
        )}
        {GROUP_ORDER.map((gid) => {
          const rows = filtered.filter((p) => groupOf(p.key) === gid);
          if (rows.length === 0) return null;
          return (
            <div key={gid}>
              <p className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-wide text-muted">{GROUP_LABELS[gid]}</p>
              <ul className="space-y-1">
                {rows.map((p) => {
                  const active = p.key === selectedKey;
                  return (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => onSelect(p.key)}
                        aria-current={active}
                        className={`w-full rounded-[var(--r-md)] border px-3 py-2 text-left transition-colors ${
                          active ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-2'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{promptName(p.key)}</span>
                          {p.is_overridden && <Badge tone="gold">Tahrirlangan</Badge>}
                        </span>
                        <span className="mt-0.5 block truncate text-2xs text-muted">{p.purpose}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
