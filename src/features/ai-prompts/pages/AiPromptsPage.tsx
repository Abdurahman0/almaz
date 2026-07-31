import { useCallback, useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog, ErrorCard, PageHeader, SkeletonRows, toast } from '@/shared/ui';
import { useHasPermission } from '@/shared/stores/auth';
import type { ApiError } from '@/shared/api/client';
import { useAiPrompts, useResetAiPrompt, useUpdateAiPrompt } from '../hooks';
import { PromptList } from '../components/PromptList';
import { PromptEditor } from '../components/PromptEditor';

export default function AiPromptsPage() {
  const prompts = useAiPrompts();
  const update = useUpdateAiPrompt();
  const reset = useResetAiPrompt();
  const canEdit = useHasPermission('ai:edit_prompt');

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOverridden, setOnlyOverridden] = useState(false);
  const [mobileEditor, setMobileEditor] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const selected = prompts.data?.find((p) => p.key === selectedKey) ?? null;
  const dirty = Boolean(selected && draft !== selected.current_value);

  const doSelect = useCallback(
    (key: string) => {
      const p = prompts.data?.find((x) => x.key === key);
      setSelectedKey(key);
      setDraft(p ? p.current_value : '');
      setMobileEditor(true);
    },
    [prompts.data],
  );

  // auto-select the first prompt once loaded (desktop shows it; mobile stays on list)
  useEffect(() => {
    if (!selectedKey && prompts.data && prompts.data.length > 0) {
      setSelectedKey(prompts.data[0].key);
      setDraft(prompts.data[0].current_value);
    }
  }, [prompts.data, selectedKey]);

  const trySelect = (key: string) => {
    if (key === selectedKey) {
      setMobileEditor(true);
      return;
    }
    if (dirty) {
      setPendingKey(key);
      return;
    }
    doSelect(key);
  };

  // block in-app navigation while there are unsaved edits
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  const handleErr = (e: unknown) => {
    const err = e as ApiError;
    toast.error(err?.status === 403 ? "Sizda tahrirlash huquqi yo'q" : err?.message || 'Xatolik yuz berdi');
  };

  const save = () => {
    if (!selected) return;
    update.mutate(
      { key: selected.key, value: draft },
      { onSuccess: () => toast.success('Saqlandi — darhol kuchga kirdi'), onError: handleErr },
    );
  };

  const resetPrompt = () => {
    if (!selected) return;
    reset.mutate(selected.key, {
      onSuccess: (data) => {
        setDraft(data.current_value);
        toast.success('Standart matnga qaytarildi');
      },
      onError: handleErr,
    });
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 148px)' }}>
      <PageHeader heading="AI Promtlar" subheading="AI matnlarini boshqaring — o'zgarishlar darhol kuchga kiradi" />

      {prompts.isError ? (
        <ErrorCard error={prompts.error} onRetry={() => prompts.refetch()} />
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_1fr]">
          {/* LEFT — list */}
          <div className={`min-h-0 flex-col overflow-hidden rounded-[var(--r-lg)] border border-border bg-surface p-3 ${mobileEditor ? 'hidden md:flex' : 'flex'}`}>
            {prompts.isPending ? (
              <SkeletonRows rows={8} />
            ) : (
              <PromptList
                prompts={prompts.data ?? []}
                selectedKey={selectedKey}
                onSelect={trySelect}
                search={search}
                setSearch={setSearch}
                onlyOverridden={onlyOverridden}
                setOnlyOverridden={setOnlyOverridden}
              />
            )}
          </div>

          {/* RIGHT — editor */}
          <div className={`min-h-0 flex-col overflow-hidden rounded-[var(--r-lg)] border border-border bg-surface p-4 ${mobileEditor ? 'flex' : 'hidden md:flex'}`}>
            {prompts.isPending ? (
              <div className="space-y-3">
                <SkeletonRows rows={2} />
                <SkeletonRows rows={6} />
              </div>
            ) : selected ? (
              <PromptEditor
                key={selected.key}
                prompt={selected}
                value={draft}
                onChange={setDraft}
                canEdit={canEdit}
                onSave={save}
                onReset={resetPrompt}
                saving={update.isPending}
                resetting={reset.isPending}
                onBack={() => setMobileEditor(false)}
              />
            ) : (
              <p className="m-auto text-sm text-muted">Chapdan promt tanlang</p>
            )}
          </div>
        </div>
      )}

      {/* unsaved-changes: switching prompts */}
      <ConfirmDialog
        open={pendingKey !== null}
        onClose={() => setPendingKey(null)}
        heading="Saqlanmagan o'zgarishlar"
        description="O'zgarishlar saqlanmadi. Boshqa promtga o'tasizmi?"
        confirmLabel="O'tish"
        onConfirm={() => {
          if (pendingKey) doSelect(pendingKey);
          setPendingKey(null);
        }}
      />

      {/* unsaved-changes: navigating away */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        heading="Saqlanmagan o'zgarishlar"
        description="O'zgarishlar saqlanmadi. Sahifadan chiqasizmi?"
        confirmLabel="Chiqish"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
