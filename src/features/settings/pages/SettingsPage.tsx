import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, Button, NumberInput, PageHeader, SkeletonRows, toast } from '@/shared/ui';
import { useUiStore, type Lang } from '@/shared/stores/ui';
import { PRESETS } from '@/shared/lib/themes';
import { switchThemeFromEvent } from '@/shared/hooks/useThemeTransition';
import { useAuthStore } from '@/shared/stores/auth';
import { formatDateTime } from '@/shared/lib/format';
import { useGoldRates, useSettings, useUpdateSetting } from '../hooks';
import { GOLD_RATE_KEYS } from '../api';
import { StaffSection } from '../components/StaffSection';
import { CardsSection } from '../components/CardsSection';
import { useAudit } from '../rbac';

function GoldRateEditor() {
  const { rate585, rate750 } = useGoldRates();
  const settings = useSettings();
  const update = useUpdateSetting();
  const [v585, setV585] = useState<number | '' | null>(null);
  const [v750, setV750] = useState<number | '' | null>(null);

  if (settings.isPending) return <SkeletonRows rows={2} />;

  const save = () => {
    const n585 = v585 === null ? rate585 : v585;
    const n750 = v750 === null ? rate750 : v750;
    const jobs: Array<Promise<unknown>> = [];
    if (typeof n585 === 'number' && n585 > 0)
      jobs.push(update.mutateAsync({ key: GOLD_RATE_KEYS['585'], value: n585 }));
    if (typeof n750 === 'number' && n750 > 0)
      jobs.push(update.mutateAsync({ key: GOLD_RATE_KEYS['750'], value: n750 }));
    Promise.all(jobs)
      .then(() => toast.success('Oltin kursi saqlandi'))
      .catch(() => toast.error('Saqlashda xatolik yuz berdi'));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <NumberInput
          label="585 proba"
          suffix="so'm/g"
          thousands
          step={10_000}
          value={v585 ?? rate585}
          onChange={setV585}
        />
        <NumberInput
          label="750 proba"
          suffix="so'm/g"
          thousands
          step={10_000}
          value={v750 ?? rate750}
          onChange={setV750}
        />
      </div>
      <Button size="sm" loading={update.isPending} onClick={save}>
        Saqlash
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { preset, setPreset, lang, setLang } = useUiStore();
  const audit = useAudit();

  return (
    <div>
      <PageHeader heading="Sozlamalar" subheading="Do'kon, kurslar va jamoa" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-md font-semibold text-text">Do'kon profili</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Egasi</dt>
              <dd className="font-semibold text-text">{user?.full_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Email</dt>
              <dd className="text-text">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Rollar</dt>
              <dd className="text-text">{user?.roles.join(', ')}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-md font-semibold text-text">Oltin kursi (1 g)</h2>
          <GoldRateEditor />
        </Card>

        <Card className="h-fit">
          <CardsSection />
        </Card>

        <Card>
          <h2 className="mb-4 text-md font-semibold text-text">Ko'rinish va til</h2>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-caps text-muted">Mavzu</p>
              <div className="flex flex-wrap gap-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    aria-pressed={preset === p.id}
                    aria-label={`Mavzu: ${p.label}`}
                    onClick={(e) => switchThemeFromEvent(e, () => setPreset(p.id))}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className="relative h-12 w-16 overflow-hidden rounded-lg border transition-transform group-hover:scale-105"
                      style={{
                        background: p.bg,
                        borderColor: preset === p.id ? p.accent : 'var(--border-strong)',
                        borderWidth: preset === p.id ? 2 : 1,
                      }}
                    >
                      <span
                        className="absolute inset-x-2 bottom-1.5 top-5 rounded-sm"
                        style={{ background: p.surface }}
                      />
                      <span
                        className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full"
                        style={{ background: p.accent }}
                      />
                      {preset === p.id && (
                        <Check
                          className="absolute bottom-1 left-1.5 h-3.5 w-3.5"
                          style={{ color: p.accent }}
                          strokeWidth={3}
                        />
                      )}
                    </span>
                    <span
                      className={`text-2xs font-medium ${
                        preset === p.id ? 'text-text' : 'text-muted'
                      }`}
                    >
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-caps text-muted">Til</p>
              <div className="flex gap-2">
                {(
                  [
                    ['uz', "O'zbekcha"],
                    ['ru', 'Русский'],
                  ] as Array<[Lang, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setLang(value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      lang === value
                        ? 'border-accent bg-accent-soft text-accent-ink'
                        : 'border-border text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-md font-semibold text-text">Amallar jurnali</h2>
          {audit.isPending && <SkeletonRows rows={4} />}
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {audit.data?.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                <span className="text-text">
                  {a.action} · <span className="text-muted">{a.entity_type}</span>
                </span>
                <span className="text-muted">{formatDateTime(a.created_at)}</span>
              </div>
            ))}
            {audit.isSuccess && audit.data.length === 0 && (
              <p className="text-sm text-muted">Jurnal bo'sh</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <StaffSection />
      </div>
    </div>
  );
}
