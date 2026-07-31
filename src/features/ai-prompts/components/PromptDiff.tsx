import { lineDiff } from '../lib';

/** Read-only line diff: default_value (a) → current edited text (b). */
export function PromptDiff({ defaultValue, current }: { defaultValue: string; current: string }) {
  const rows = lineDiff(defaultValue, current);
  const changed = rows.some((r) => r.type !== 'same');
  return (
    <div className="rounded-[var(--r-md)] border border-border bg-surface-2">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-2xs text-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger" /> Standart</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" /> Hozirgi</span>
        {!changed && <span className="ml-auto">Farq yo'q — standart bilan bir xil</span>}
      </div>
      <div className="max-h-[420px] overflow-auto p-1 font-mono text-xs leading-relaxed">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap break-words px-2 ${
              r.type === 'add'
                ? 'bg-success-soft text-success'
                : r.type === 'del'
                  ? 'bg-danger-soft text-danger'
                  : 'text-text'
            }`}
          >
            <span className="mr-2 select-none text-muted">{r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' '}</span>
            {r.text || ' '}
          </div>
        ))}
      </div>
    </div>
  );
}
