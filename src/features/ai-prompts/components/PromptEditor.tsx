import { useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Copy, GitCompare, Info, RotateCcw, Save } from 'lucide-react';
import { Badge, Button, ConfirmDialog } from '@/shared/ui';
import type { AiPromptOut } from '../types';
import { missingPlaceholders, parsePlaceholders, promptName } from '../lib';
import { PromptDiff } from './PromptDiff';

export function PromptEditor({
  prompt,
  value,
  onChange,
  canEdit,
  onSave,
  onReset,
  saving,
  resetting,
  onBack,
}: {
  prompt: AiPromptOut;
  value: string;
  onChange: (v: string) => void;
  canEdit: boolean;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  resetting: boolean;
  onBack?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const dirty = value !== prompt.current_value;
  const tokens = parsePlaceholders(prompt.placeholders);
  const missing = prompt.key === 'ai_system_prompt' ? [] : missingPlaceholders(prompt.placeholders, value);

  const insertToken = (token: string) => {
    const el = textareaRef.current;
    if (!el || !canEdit) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const copyKey = () => {
    navigator.clipboard?.writeText(prompt.key).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="mb-3 shrink-0">
        {onBack && (
          <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-sm text-accent-ink md:hidden">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Ro'yxat
          </button>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-md font-semibold text-text">{promptName(prompt.key)}</h2>
          {prompt.is_overridden ? <Badge tone="gold">Tahrirlangan</Badge> : <Badge tone="muted">Standart</Badge>}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-2xs text-muted">{prompt.key}</code>
          <button type="button" onClick={copyKey} aria-label="Kalitni nusxalash" className="rounded p-1 text-muted transition-colors hover:text-text">
            {copied ? <Check className="h-3.5 w-3.5 text-success" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_280px] lg:gap-4">
        {/* main column */}
        <div className="min-w-0 space-y-3">
          {!canEdit && (
            <p className="flex items-start gap-2 rounded-[var(--r-md)] bg-surface-2 p-3 text-2xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Ko'rish rejimi — tahrirlash uchun «ai:edit_prompt» huquqi kerak.
            </p>
          )}

          <div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={!canEdit}
              spellCheck={false}
              wrap="soft"
              className="min-h-[420px] w-full resize-y rounded-[var(--r-md)] border border-border bg-surface-2 p-3 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-accent disabled:opacity-70"
            />
            <div className="mt-1 flex items-center justify-between text-2xs text-muted">
              <span>{canEdit ? 'O‘zgarishlar darhol kuchga kiradi — deploy shart emas.' : ''}</span>
              <span className="tnum">{value.length} ta belgi</span>
            </div>
          </div>

          {/* missing placeholder warnings */}
          {missing.length > 0 && (
            <div className="space-y-1 rounded-[var(--r-md)] border border-danger-soft bg-danger-soft/60 p-3">
              {missing.map((ph) => (
                <p key={ph} className="flex items-center gap-1.5 text-2xs text-danger">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span><code className="font-mono">{ph}</code> yo'qolgan — kod uni to'ldiradi, saqlanishi shart</span>
                </p>
              ))}
            </div>
          )}

          {/* actions */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onSave} loading={saving} disabled={!dirty}>
                <Save className="h-4 w-4" strokeWidth={1.75} /> Saqlash
              </Button>
              <Button variant="secondary" onClick={() => setConfirmReset(true)} loading={resetting} disabled={!prompt.is_overridden}>
                <RotateCcw className="h-4 w-4" strokeWidth={1.75} /> Standartga qaytarish
              </Button>
              <Button variant="ghost" onClick={() => setShowDiff((v) => !v)}>
                <GitCompare className="h-4 w-4" strokeWidth={1.75} /> Standart bilan solishtirish
              </Button>
            </div>
          )}
          {!canEdit && (
            <Button variant="ghost" onClick={() => setShowDiff((v) => !v)}>
              <GitCompare className="h-4 w-4" strokeWidth={1.75} /> Standart bilan solishtirish
            </Button>
          )}

          {showDiff && <PromptDiff defaultValue={prompt.default_value} current={value} />}
        </div>

        {/* meta column */}
        <aside className="mt-4 space-y-4 lg:mt-0">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted">Vazifasi</p>
            <p className="mt-1 text-sm text-text">{prompt.purpose}</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted">Qayerda ishlatiladi</p>
            <p className="mt-1 break-words font-mono text-2xs text-muted">{prompt.used_in}</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted">Placeholderlar</p>
            {tokens.length === 0 ? (
              <p className="mt-1 text-2xs text-muted">Yo'q</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tokens.map((tk) => {
                  const isMissing = missing.includes(tk);
                  return (
                    <button
                      key={tk}
                      type="button"
                      onClick={() => insertToken(tk)}
                      disabled={!canEdit}
                      title={canEdit ? 'Kursorga qo‘shish' : undefined}
                      className={`rounded-full border px-2 py-0.5 font-mono text-2xs transition-colors disabled:cursor-default ${
                        isMissing ? 'border-danger bg-danger-soft text-danger' : 'border-border bg-surface-2 text-accent-ink hover:border-accent'
                      }`}
                    >
                      {tk}
                    </button>
                  );
                })}
              </div>
            )}
            {prompt.key === 'ai_system_prompt' && (
              <p className="mt-1.5 text-2xs text-muted">Bu matn hech qachon .format() qilinmaydi — placeholder ogohlantirishlari yo'q.</p>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        heading="Standartga qaytarish"
        description="Standart matnga qaytarilsinmi? Tahrirlaringiz yo'qoladi."
        confirmLabel="Qaytarish"
        onConfirm={() => {
          setConfirmReset(false);
          onReset();
        }}
      />
    </div>
  );
}
