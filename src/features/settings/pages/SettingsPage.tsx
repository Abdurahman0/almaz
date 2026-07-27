import { useState } from 'react';
import { Check } from 'lucide-react';
import { Card, Button, NumberInput, PageHeader, SkeletonRows, Switch, toast } from '@/shared/ui';
import { useUiStore, type Lang } from '@/shared/stores/ui';
import { PRESETS } from '@/shared/lib/themes';
import { switchThemeFromEvent } from '@/shared/hooks/useThemeTransition';
import { useAuthStore } from '@/shared/stores/auth';
import {
  useAiEnabled,
  useAiPauseMinutes,
  useBoxesEnabled,
  useEngravingPrice,
  useLowStockThreshold,
  useSettings,
  useUpdateSetting,
} from '../hooks';
import { SETTING_KEYS } from '../api';
import { CardsSection } from '../components/CardsSection';

/** Global commerce settings: engraving price + low-stock threshold. */
function CommerceSettingsEditor() {
  const engravingPrice = useEngravingPrice();
  const lowStock = useLowStockThreshold();
  const boxesEnabled = useBoxesEnabled();
  const settings = useSettings();
  const update = useUpdateSetting();
  const [eng, setEng] = useState<number | '' | null>(null);
  const [low, setLow] = useState<number | '' | null>(null);

  if (settings.isPending) return <SkeletonRows rows={2} />;

  const toggleBoxes = (checked: boolean) =>
    update.mutate(
      { key: SETTING_KEYS.boxesEnabled, value: checked },
      {
        onSuccess: () => toast.success(checked ? 'Qutilar yoqildi' : "Qutilar o'chirildi"),
        onError: () => toast.error('Saqlashda xatolik yuz berdi'),
      },
    );

  const save = () => {
    const nEng = eng === null ? engravingPrice : eng;
    const nLow = low === null ? lowStock : low;
    const jobs: Array<Promise<unknown>> = [];
    if (typeof nEng === 'number' && nEng >= 0)
      jobs.push(update.mutateAsync({ key: SETTING_KEYS.engravingPrice, value: nEng }));
    if (typeof nLow === 'number' && nLow >= 0)
      jobs.push(update.mutateAsync({ key: SETTING_KEYS.lowStockThreshold, value: nLow }));
    Promise.all(jobs)
      .then(() => toast.success('Sozlamalar saqlandi'))
      .catch(() => toast.error('Saqlashda xatolik yuz berdi'));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <NumberInput
          label="Gravirovka narxi"
          suffix="so'm"
          thousands
          step={10_000}
          min={0}
          value={eng ?? engravingPrice}
          onChange={setEng}
        />
        <NumberInput
          label="Kam qolgan chegarasi"
          suffix="dona"
          step={1}
          min={0}
          value={low ?? lowStock}
          onChange={setLow}
        />
      </div>
      <p className="text-xs text-muted">
        Gravirovka narxi mahsulotда ko'rsatilmasa shu ishlatiladi. Chegara — mahsulotда o'z qiymati bo'lmasa.
      </p>
      <Button size="sm" loading={update.isPending} onClick={save}>
        Saqlash
      </Button>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">Rangli qutilar (sovg'a quti)</p>
          <p className="text-xs text-muted">O'chirilsa buyurtma va AI quti qabul qilmaydi</p>
        </div>
        <Switch checked={boxesEnabled} onCheckedChange={toggleBoxes} />
      </div>
    </div>
  );
}

/** Global AI controls: system on/off + auto-pause minutes when an operator types. */
function AiSettingsEditor() {
  const aiEnabled = useAiEnabled();
  const pauseMinutes = useAiPauseMinutes();
  const settings = useSettings();
  const update = useUpdateSetting();
  const [min, setMin] = useState<number | '' | null>(null);

  if (settings.isPending) return <SkeletonRows rows={2} />;

  const toggle = (checked: boolean) =>
    update.mutate(
      { key: SETTING_KEYS.aiEnabled, value: checked },
      {
        onSuccess: () => toast.success(checked ? 'AI yoqildi' : "AI o'chirildi"),
        onError: () => toast.error('Saqlashda xatolik yuz berdi'),
      },
    );

  const saveMinutes = () => {
    const v = min === null ? pauseMinutes : min;
    if (typeof v !== 'number' || v < 0) return;
    update.mutate(
      { key: SETTING_KEYS.aiPauseMinutes, value: v },
      {
        onSuccess: () => toast.success('Sozlamalar saqlandi'),
        onError: () => toast.error('Saqlashda xatolik yuz berdi'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">AI global yoqilgan</p>
          <p className="text-xs text-muted">O'chirilsa butun tizim bo'yicha AI javob bermaydi</p>
        </div>
        <Switch checked={aiEnabled} onCheckedChange={toggle} />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <NumberInput
            label="Avto-pauza (operator yozganda)"
            suffix="daqiqa"
            step={5}
            min={0}
            value={min ?? pauseMinutes}
            onChange={setMin}
          />
        </div>
        <Button size="sm" loading={update.isPending} onClick={saveMinutes}>
          Saqlash
        </Button>
      </div>
      <p className="text-xs text-muted">
        Operator xabar yozsa, AI shu muddatga vaqtinchalik jimadi. Uzoq/butunlay to'xtatish suhbat
        ichida boshqariladi.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { preset, setPreset, lang, setLang } = useUiStore();

  return (
    <div>
      <PageHeader heading="Sozlamalar" subheading="Do'kon, narxlar va jamoa" />

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
          <h2 className="mb-4 text-md font-semibold text-text">Narx / sklad sozlamalari</h2>
          <CommerceSettingsEditor />
        </Card>

        <Card>
          <h2 className="mb-4 text-md font-semibold text-text">AI sozlamalari</h2>
          <AiSettingsEditor />
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

      </div>
    </div>
  );
}
