import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Link2, RefreshCw, Send, Trash2, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorCard,
  Input,
  PageHeader,
  PasswordInput,
  Select,
  SkeletonRows,
  Switch,
  toast,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useHasPermission } from '@/shared/stores/auth';
import type { IntegrationConfigOut } from '@/shared/api/types';
import {
  useDeleteConfig,
  useIgSubscribe,
  useIntegrationConfigs,
  useIntegrationEvents,
  usePatchConfig,
  useTelegramWebhookInfo,
  useTgDeleteWebhook,
  useTgMe,
  useTgSetWebhook,
  useUpsertConfig,
} from '../hooks';

interface KeySpec {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
  hint?: string;
}

const PROVIDERS: Array<{ id: string; label: string; keys: KeySpec[] }> = [
  {
    id: 'telegram',
    label: 'Telegram',
    keys: [
      { key: 'bot_token', label: 'Bot token', secret: true, placeholder: '123456:ABC-...' },
      { key: 'webhook_secret', label: 'Webhook secret', secret: true },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    keys: [
      { key: 'access_token', label: 'Access token', secret: true },
      { key: 'business_id', label: 'Business ID' },
      { key: 'verify_token', label: 'Verify token', secret: true },
      { key: 'app_secret', label: 'App secret', secret: true },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keys: [
      { key: 'api_key', label: 'API key', secret: true, placeholder: 'sk-...' },
      {
        key: 'base_url',
        label: 'Base URL',
        placeholder: 'https://api.openai.com/v1',
        hint: "Bo'sh qoldirmang — kerak bo'lmasa umuman qo'shmang/o'chiring.",
      },
    ],
  },
];

function ConfigKeyField({
  provider,
  spec,
  existing,
}: {
  provider: string;
  spec: KeySpec;
  existing?: IntegrationConfigOut;
}) {
  const upsert = useUpsertConfig();
  const patch = usePatchConfig();
  const del = useDeleteConfig();
  const [val, setVal] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const current = val ?? existing?.value ?? '';
  const Field = spec.secret ? PasswordInput : Input;

  const save = () =>
    upsert.mutate(
      { provider, key: spec.key, value: current, is_active: existing?.is_active ?? true },
      {
        onSuccess: () => { toast.success('Saqlandi'); setVal(null); },
        onError: () => toast.error('Saqlashda xatolik'),
      },
    );

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <Field
            label={spec.label}
            placeholder={spec.placeholder}
            value={current}
            onChange={(e) => setVal(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={save} loading={upsert.isPending} disabled={!current.trim() || val === null}>
          Saqlash
        </Button>
        {existing && (
          <>
            <Switch
              checked={existing.is_active}
              onCheckedChange={(c) =>
                patch.mutate(
                  { id: existing.id, body: { is_active: c } },
                  { onError: () => toast.error('Xatolik') },
                )
              }
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label="O'chirish"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <ConfirmDialog
              open={confirming}
              onClose={() => setConfirming(false)}
              heading="Sozlamani o'chirish"
              description={`«${spec.label}» butunlay o'chiriladi. Integratsiya ishlashdan to'xtashi mumkin.`}
              onConfirm={async () => {
                await del.mutateAsync(existing.id);
                toast.success("O'chirildi");
                setConfirming(false);
              }}
            />
          </>
        )}
      </div>
      {spec.hint && <p className="text-2xs text-muted">{spec.hint}</p>}
    </div>
  );
}

function TelegramActions() {
  const info = useTelegramWebhookInfo();
  const setWh = useTgSetWebhook();
  const delWh = useTgDeleteWebhook();
  const me = useTgMe();
  const [url, setUrl] = useState('');

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="rounded-[var(--r-sm)] border border-border p-3 text-xs">
        <p className="mb-1 font-semibold text-text">Webhook holati</p>
        {info.isPending && <SkeletonRows rows={1} />}
        {info.isError && <p className="text-muted">Ma'lumot yo'q (token kiritilganmi?)</p>}
        {info.data && (
          <dl className="space-y-1 text-muted">
            <div className="flex justify-between gap-3">
              <dt>URL</dt>
              <dd className="tnum truncate text-right text-text">{info.data.url || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Navbatdagi</dt>
              <dd className="text-text">{info.data.pending_update_count ?? 0}</dd>
            </div>
            {info.data.last_error_message && (
              <div className="flex justify-between gap-3">
                <dt>Oxirgi xato</dt>
                <dd className="text-right text-danger">{info.data.last_error_message}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Webhook URL"
            placeholder="https://api.example.com/webhooks/telegram/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          loading={setWh.isPending}
          disabled={!url.trim()}
          onClick={() =>
            setWh.mutate(url.trim(), {
              onSuccess: () => toast.success("Webhook o'rnatildi"),
              onError: () => toast.error('Xatolik'),
            })
          }
        >
          <Link2 className="h-4 w-4" strokeWidth={1.5} /> O'rnatish
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={me.isPending} onClick={() => me.mutate(undefined, { onError: () => toast.error('Xatolik') })}>
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Bot ma'lumoti
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={delWh.isPending}
          onClick={() =>
            delWh.mutate(undefined, {
              onSuccess: () => toast.success("Webhook o'chirildi"),
              onError: () => toast.error('Xatolik'),
            })
          }
        >
          Webhookni o'chirish
        </Button>
      </div>
      {me.data && (
        <p className="rounded-[var(--r-sm)] border border-border bg-surface-2/40 px-3 py-2 text-xs text-text">
          @{String((me.data as Record<string, unknown>).username ?? '—')} ·{' '}
          {String((me.data as Record<string, unknown>).first_name ?? '')}
        </p>
      )}
    </div>
  );
}

function InstagramActions() {
  const sub = useIgSubscribe();
  return (
    <div className="mt-4 border-t border-border pt-4">
      <Button
        size="sm"
        variant="secondary"
        loading={sub.isPending}
        onClick={() =>
          sub.mutate(undefined, {
            onSuccess: () => toast.success('Webhookka obuna qilindi'),
            onError: () => toast.error('Obunada xatolik'),
          })
        }
      >
        <Send className="h-4 w-4" strokeWidth={1.5} /> Webhookka obuna
      </Button>
      <p className="mt-2 text-2xs text-muted">Instagram akkauntni webhookka obuna qilish majburiy.</p>
    </div>
  );
}

function EventsLog() {
  const [provider, setProvider] = useState('');
  const events = useIntegrationEvents({ limit: 20, provider: provider || undefined });
  const total = events.data?.total;
  return (
    <Card className="overflow-x-auto p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
        <h2 className="text-md font-semibold text-text">
          Eventlar{total != null && <span className="text-muted"> · {total}</span>}
        </h2>
        <div className="w-44">
          <Select
            size="sm"
            placeholder="Barcha providerlar"
            options={[
              { value: '', label: 'Barcha providerlar' },
              ...PROVIDERS.map((p) => ({ value: p.id, label: p.label })),
            ]}
            value={provider}
            onChange={setProvider}
          />
        </div>
      </div>
      {events.isPending && <div className="p-6"><SkeletonRows rows={4} /></div>}
      {events.isError && <div className="p-6"><ErrorCard error={events.error} onRetry={() => events.refetch()} /></div>}
      {events.isSuccess && events.data.items.length === 0 && (
        <EmptyState heading="Eventlar yo'q" hint="Kelgan webhook payloadlari shu yerda ko'rinadi" />
      )}
      {events.isSuccess && events.data.items.length > 0 && (
        <table className="data-table mt-3 min-w-[560px]">
          <tbody>
            {events.data.items.map((e) => {
              const failed = !(e.status === 'ok' || e.status === 'processed' || e.status === 'received');
              return (
                <tr key={e.id}>
                  <td><Badge tone="muted">{e.provider}</Badge></td>
                  <td className="text-muted">
                    <span className="inline-flex items-center gap-1">
                      {e.direction === 'inbound'
                        ? <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                        : <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      {e.direction === 'inbound' ? 'Kirish' : 'Chiqish'}
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 ${failed ? 'text-danger' : 'text-success'}`}>
                      {failed
                        ? <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      {e.status}
                    </span>
                    {failed && e.note && <p className="mt-0.5 max-w-[260px] truncate text-2xs text-muted">{e.note}</p>}
                  </td>
                  <td className="tnum text-right text-muted">{formatDateTime(e.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default function IntegrationsPage() {
  const canManage = useHasPermission('settings:manage_integrations');
  const configs = useIntegrationConfigs();

  if (!canManage) {
    return (
      <div>
        <PageHeader heading="Integratsiyalar" />
        <EmptyState heading="Ruxsat yo'q" hint="Bu bo'lim uchun integratsiyalarni boshqarish huquqi kerak" />
      </div>
    );
  }

  const findConfig = (provider: string, key: string) =>
    configs.data?.find((c) => c.provider === provider && c.key === key);

  return (
    <div className="space-y-6">
      <PageHeader heading="Integratsiyalar" subheading="Telegram, Instagram va OpenAI tokenlari" />

      {configs.isPending && <SkeletonRows rows={4} />}
      {configs.isError && <ErrorCard error={configs.error} onRetry={() => configs.refetch()} />}

      {configs.isSuccess && (
        <div className="grid gap-6 lg:grid-cols-2">
          {PROVIDERS.map((prov) => (
            <Card key={prov.id}>
              <h2 className="mb-4 text-md font-semibold text-text">{prov.label}</h2>
              <div className="space-y-3">
                {prov.keys.map((spec) => (
                  <ConfigKeyField
                    key={spec.key}
                    provider={prov.id}
                    spec={spec}
                    existing={findConfig(prov.id, spec.key)}
                  />
                ))}
              </div>
              {prov.id === 'telegram' && <TelegramActions />}
              {prov.id === 'instagram' && <InstagramActions />}
            </Card>
          ))}
        </div>
      )}

      <EventsLog />
    </div>
  );
}
