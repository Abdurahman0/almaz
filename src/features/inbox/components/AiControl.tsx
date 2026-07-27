import { useState } from 'react';
import { Bot, CalendarClock, ChevronDown, Clock, MessageSquareReply, Power, Sparkles } from 'lucide-react';
import {
  Badge,
  Button,
  DatePicker,
  DropdownMenu,
  Modal,
  TimePicker,
  toast,
  type MenuItem,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import type { ConversationOut } from '@/shared/api/types';
import { useAiControl, useForceAiRespond } from '../hooks';
import { useAiPauseMinutes } from '@/features/settings/hooks';

const SKIP_REASONS: Record<string, string> = {
  operator_handoff: 'Suhbat operatorда',
  ai_disabled: "AI o'chirilgan (global)",
  closed: 'Suhbat yopilgan',
};
function skipMessage(reason: string | null): string {
  if (!reason) return 'AI javob bermadi';
  if (reason.startsWith('llm_error')) return 'AI xatosi: LLM sozlanmagan';
  return SKIP_REASONS[reason] ?? `AI javob bermadi: ${reason}`;
}

type AiStatus = 'off' | 'paused' | 'active';

function statusOf(conv: ConversationOut): { status: AiStatus; until: Date | null } {
  if (!conv.ai_enabled) return { status: 'off', until: null };
  const until = conv.ai_paused_until ? new Date(conv.ai_paused_until) : null;
  if (until && until.getTime() > Date.now()) return { status: 'paused', until };
  return { status: 'active', until: null };
}

/** Per-conversation AI switch: off / pause (minutes or exact date-time) / on. */
export function AiControl({ conv }: { conv: ConversationOut }) {
  const control = useAiControl(conv.id);
  const force = useForceAiRespond(conv.id);
  const pauseMinutes = useAiPauseMinutes();
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');

  const { status, until } = statusOf(conv);

  const run = (body: Parameters<typeof control.mutate>[0], ok: string) =>
    control.mutate(body, {
      onSuccess: () => toast.success(ok),
      onError: () => toast.error('Amalni bajarishда xatolik'),
    });

  const forceRespond = () =>
    force.mutate(undefined, {
      onSuccess: (res) =>
        res.status === 'replied'
          ? toast.success('AI javob berdi')
          : toast.error(skipMessage(res.reason)),
      onError: () => toast.error('AI javobini olishда xatolik'),
    });

  const tone = status === 'off' ? 'rose' : status === 'paused' ? 'gold' : 'success';
  const label =
    status === 'off' ? "AI o'chiq" : status === 'paused' ? 'AI pauza' : 'AI faol';

  const items: MenuItem[] = [];
  items.push({
    label: 'AI hozir javob bersin',
    icon: <MessageSquareReply className="h-4 w-4" strokeWidth={1.5} />,
    onSelect: forceRespond,
  });
  if (status !== 'active') {
    items.push({
      label: "AI'ni yoqish",
      icon: <Sparkles className="h-4 w-4" strokeWidth={1.5} />,
      separatorBefore: true,
      onSelect: () => run({ mode: 'on' }, 'AI yoqildi'),
    });
  }
  if (status !== 'off') {
    items.push({
      label: `${pauseMinutes} daqiqaga pauza`,
      icon: <Clock className="h-4 w-4" strokeWidth={1.5} />,
      onSelect: () => run({ mode: 'pause_minutes', minutes: pauseMinutes }, `AI ${pauseMinutes} daqiqaga jimadi`),
    });
  }
  items.push({
    label: 'Sanagacha pauza…',
    icon: <CalendarClock className="h-4 w-4" strokeWidth={1.5} />,
    onSelect: () => setModalOpen(true),
  });
  if (status !== 'off') {
    items.push({
      label: "AI'ni butunlay o'chirish",
      icon: <Power className="h-4 w-4" strokeWidth={1.5} />,
      destructive: true,
      separatorBefore: true,
      onSelect: () => run({ mode: 'off' }, "AI o'chirildi"),
    });
  }

  const submitUntil = () => {
    if (!date) return toast.error('Sanani tanlang');
    const dt = new Date(`${date}T${time || '00:00'}`);
    if (Number.isNaN(dt.getTime())) return toast.error("Sana-vaqt noto'g'ri");
    if (dt.getTime() <= Date.now()) return toast.error('Kelajakdagi vaqtni tanlang');
    run({ mode: 'pause_until', until: dt.toISOString() }, `AI ${formatDateTime(dt.toISOString())} gacha jimadi`);
    setModalOpen(false);
  };

  const trigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-strong"
      aria-label="AI boshqaruvi"
    >
      <Bot className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
      <Badge tone={tone}>{label}</Badge>
      {status === 'paused' && until && (
        <span className="tnum hidden text-2xs text-muted sm:inline">
          {formatDateTime(until.toISOString())} gacha
        </span>
      )}
      <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
    </button>
  );

  return (
    <>
      <DropdownMenu items={items} trigger={trigger} ariaLabel="AI boshqaruvi" />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} heading="AI'ni sanagacha to'xtatish">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Tanlangan sana-vaqtgacha AI shu suhbatда jim turadi. Mijoz yozsa ham faqat operator javob beradi.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <DatePicker label="Sana" value={date} onChange={setDate} />
            <TimePicker label="Vaqt" value={time} onChange={setTime} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button loading={control.isPending} onClick={submitUntil}>
              Pauza qo'yish
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
