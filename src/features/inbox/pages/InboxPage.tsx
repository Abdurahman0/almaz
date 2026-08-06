import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bot, ExternalLink, Instagram, MoreVertical, Paperclip, Phone, Search, Send, Trash2 } from 'lucide-react';
import { Badge, Card, Checkbox, ConfirmDialog, DropdownMenu, EmptyState, ErrorCard, Select, SkeletonRows, toast, type SelectOption } from '@/shared/ui';
import { formatTime } from '@/shared/lib/format';
import { useConversations, useDeleteConversation, useMarkRead, useMessages, useSendMessage } from '../hooks';
import { ConversationHeader } from '../components/ConversationHeader';
import { VoiceMessage } from '../components/VoiceMessage';
import { formatPhone } from '../phone';
import type { AiState, Channel, ConversationOut, ConversationStatus } from '@/shared/api/types';

const channelOptions: SelectOption[] = [
  { value: '', label: 'Barcha kanallar' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
];
const statusOptions: SelectOption[] = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'open', label: 'Ochiq' },
  { value: 'closed', label: 'Yopilgan' },
];

const aiStateLabels: Record<AiState, string> = {
  greeting: 'Salomlashuv',
  browsing: "Ko'rmoqda",
  recommending: 'Tavsiya',
  ordering: 'Buyurtma',
  awaiting_location: 'Manzil kutilmoqda',
  awaiting_payment: "To'lov kutilmoqda",
  payment_review: "To'lov tekshiruvda",
  handed_off: 'Operatorda',
  closed: 'Yopilgan',
};

// ---------------- message media / links ----------------
type Media = { kind: 'image' | 'video' | 'audio' | 'ig' | 'file'; url: string };
const IG_RE = /instagram\.com\//i;

function attUrl(a: unknown): string | null {
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') {
    const o = a as Record<string, unknown>;
    for (const k of ['url', 'image_url', 'media_url', 'file_url', 'src', 'preview_url']) {
      if (typeof o[k] === 'string' && o[k]) return o[k] as string;
    }
  }
  return null;
}
function attKind(a: unknown, url: string): Media['kind'] {
  const o = a && typeof a === 'object' ? (a as Record<string, unknown>) : {};
  const raw = String(o.type ?? o.kind ?? o.mime_type ?? '').toLowerCase();
  if (IG_RE.test(url)) return 'ig';
  if (raw.startsWith('image') || raw === 'photo' || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url)) return 'image';
  if (raw.startsWith('video') || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) return 'video';
  if (raw.startsWith('audio') || raw === 'voice' || /\.(mp3|ogg|opus|m4a|wav|aac)(\?|$)/i.test(url)) return 'audio';
  return 'file';
}

function MediaChip({ m, out }: { m: Media; out: boolean }) {
  if (m.kind === 'audio') return <VoiceMessage url={m.url} out={out} />;
  if (m.kind === 'image') {
    return (
      <img
        src={m.url}
        alt=""
        loading="lazy"
        onClick={() => window.open(m.url, '_blank')}
        className="max-h-56 max-w-full cursor-pointer rounded-[var(--r-md)] object-cover"
      />
    );
  }
  if (m.kind === 'ig') {
    return (
      <a
        href={m.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-text transition-colors hover:border-strong"
      >
        <Instagram className="h-4 w-4" style={{ color: '#E4405F' }} strokeWidth={1.75} />
        Instagram’da ochish
        <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
      </a>
    );
  }
  const label = m.kind === 'video' ? 'Video' : 'Fayl';
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2 text-sm text-text transition-colors hover:border-strong"
    >
      <Paperclip className="h-4 w-4 text-muted" strokeWidth={1.75} /> {label}
      <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
    </a>
  );
}

function MessageBody({ content, attachments, out }: { content: string | null; attachments: unknown[] | null; out: boolean }) {
  const media: Media[] = [];
  for (const a of attachments ?? []) {
    const url = attUrl(a);
    if (url) media.push({ kind: attKind(a, url), url });
  }
  let text = content ?? '';
  // pull Instagram links out of the text into proper cards
  const igLinks = text.match(/https?:\/\/\S*instagram\.com\/\S*/gi) ?? [];
  for (const u of igLinks) {
    media.push({ kind: 'ig', url: u });
    text = text.replace(u, '').trim();
  }
  const parts = text.split(/(https?:\/\/[^\s]+)/gi);
  return (
    <div className="space-y-2">
      {media.map((m, i) => (
        <MediaChip key={i} m={m} out={out} />
      ))}
      {text && (
        <p className="whitespace-pre-wrap break-words">
          {parts.map((part, i) =>
            /^https?:\/\//i.test(part) ? (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noreferrer"
                className={`underline underline-offset-2 ${out ? 'text-on-accent' : 'text-accent-ink'}`}
              >
                {part}
              </a>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </p>
      )}
    </div>
  );
}

function ConversationRow({ conv, active, onClick, onDelete }: {
  conv: ConversationOut;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const name = conv.customer?.full_name ?? conv.customer?.username ?? 'Mijoz';
  const phone = conv.customer?.phone;
  return (
    <div className={`group relative flex items-stretch border-b border-border transition-colors last:border-0 ${
      active ? 'bg-accent-soft' : 'hover:bg-surface-2'
    }`}>
      <button onClick={onClick} className="min-w-0 flex-1 px-4 py-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-text">{name}</span>
          <span className="shrink-0 text-2xs text-muted">{formatTime(conv.last_activity_at)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted">{conv.last_message ?? '—'}</span>
          {conv.unread_count > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-2xs font-bold text-on-accent">
              {conv.unread_count}
            </span>
          )}
        </div>
        {phone && (
          <p className="mt-1 flex items-center gap-1 text-2xs text-muted">
            <Phone className="h-3 w-3" strokeWidth={1.75} /> {formatPhone(phone)}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone="muted">{conv.channel === 'telegram' ? 'Telegram' : 'Instagram'}</Badge>
          <Badge tone={conv.ai_state === 'handed_off' ? 'rose' : 'gold'}>
            {aiStateLabels[conv.ai_state]}
          </Badge>
          {!conv.ai_enabled ? (
            <Badge tone="rose">AI o'chiq</Badge>
          ) : (
            conv.ai_paused_until &&
            new Date(conv.ai_paused_until).getTime() > Date.now() && <Badge tone="gold">AI pauza</Badge>
          )}
        </div>
      </button>
      <span className="flex items-center pr-1.5">
        <DropdownMenu
          items={[{ label: "Suhbatni o'chirish", icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />, destructive: true, onSelect: onDelete }]}
          trigger={
            <button aria-label="Amallar" className="rounded-[var(--r-sm)] p-1.5 text-muted opacity-100 transition-colors hover:bg-surface hover:text-text md:opacity-0 md:group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
            </button>
          }
        />
      </span>
    </div>
  );
}

export default function InboxPage() {
  const { conversationId = '' } = useParams();
  const navigate = useNavigate();

  // filters
  const [search, setSearch] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  const convParams = useMemo(
    () => ({
      q: debouncedQ || undefined,
      channel: (channel as Channel) || undefined,
      status: (status as ConversationStatus) || undefined,
      unread_only: unreadOnly || undefined,
    }),
    [debouncedQ, channel, status, unreadOnly],
  );

  const conversations = useConversations(convParams);
  const messages = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkRead();
  const deleteConversation = useDeleteConversation();
  const [rowDelete, setRowDelete] = useState<ConversationOut | null>(null);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = conversations.data?.find((c) => c.id === conversationId);

  useEffect(() => {
    if (conversationId && selected && selected.unread_count > 0) markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, selected?.unread_count]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.data?.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage.mutate(trimmed);
    setText('');
  };

  return (
    <div>
      <h1 className="mb-6 text-xl text-text">Xabarlar</h1>
      <Card className="grid h-[80vh] grid-cols-1 overflow-hidden p-0 md:grid-cols-[320px_1fr]">
        <div className={`flex flex-col overflow-hidden border-r border-border ${conversationId ? 'hidden md:flex' : ''}`}>
          {/* Filters */}
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.5} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ism / username / ID..."
                aria-label="Suhbat qidirish"
                className="w-full rounded-[var(--r-md)] border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-text placeholder:text-muted focus:border-accent"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select size="sm" placeholder="Kanal" options={channelOptions} value={channel} onChange={setChannel} />
              </div>
              <div className="flex-1">
                <Select size="sm" placeholder="Holat" options={statusOptions} value={status} onChange={setStatus} />
              </div>
            </div>
            <Checkbox checked={unreadOnly} onCheckedChange={setUnreadOnly} label="Faqat o'qilmagan" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.isPending && <div className="p-4"><SkeletonRows rows={6} /></div>}
          {conversations.isError && (
            <div className="p-4">
              <ErrorCard error={conversations.error} onRetry={() => conversations.refetch()} />
            </div>
          )}
          {conversations.isSuccess && conversations.data.length === 0 && (
            <EmptyState heading="Suhbatlar yo'q" hint="Telegram va Instagram xabarlari shu yerda" />
          )}
          {conversations.data?.map((c) => (
            <ConversationRow
              key={c.id}
              conv={c}
              active={c.id === conversationId}
              onClick={() => navigate(`/inbox/${c.id}`)}
              onDelete={() => setRowDelete(c)}
            />
          ))}
          </div>
        </div>

        <div className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${conversationId ? '' : 'hidden md:flex'}`}>
          {!conversationId && (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState heading="Suhbat tanlang" hint="Chapdagi ro'yxatdan suhbatni oching" />
            </div>
          )}
          {conversationId && (
            <>
              {selected && (
                <ConversationHeader
                  conv={selected}
                  aiStateLabel={aiStateLabels[selected.ai_state]}
                  onDeleted={() => navigate('/inbox')}
                />
              )}

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-bg p-4">
                {messages.isPending && <SkeletonRows rows={5} />}
                {messages.data?.map((m) => {
                  const out = m.direction === 'outgoing';
                  return (
                    <div key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[72%] px-3.5 py-2.5 text-sm shadow-xs ${
                          out
                            ? 'rounded-[var(--r-lg)] rounded-br-[var(--r-xs)] bg-accent-btn text-on-accent'
                            : 'rounded-[var(--r-lg)] rounded-bl-[var(--r-xs)] border border-border bg-surface text-text'
                        }`}
                      >
                        {m.sender_type === 'ai' && !out && (
                          <span className="mb-0.5 flex items-center gap-1 text-2xs font-semibold text-accent-ink">
                            <Bot className="h-3 w-3" strokeWidth={1.75} /> AI
                          </span>
                        )}
                        <MessageBody content={m.content} attachments={m.attachments} out={out} />
                        <p className={`mt-1 text-right text-2xs ${out ? 'text-on-accent/60' : 'text-muted'}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-center gap-2 border-t border-border p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Xabar yozing..."
                  aria-label="Xabar"
                  className="h-11 flex-1 rounded-full border border-border bg-surface-2 px-4 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  aria-label="Yuborish"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-btn text-on-accent shadow-xs transition-transform hover:bg-accent-btn-hover active:scale-95 disabled:opacity-40"
                >
                  <Send className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              </div>
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(rowDelete)}
        onClose={() => setRowDelete(null)}
        heading="Suhbatni o'chirish"
        description="Suhbat va xabarlar o'chiriladi. Mijoz saqlanadi."
        confirmLabel="O'chirish"
        onConfirm={async () => {
          if (!rowDelete) return;
          const wasOpen = rowDelete.id === conversationId;
          await deleteConversation.mutateAsync(rowDelete.id);
          toast.success("Suhbat o'chirildi");
          setRowDelete(null);
          if (wasOpen) navigate('/inbox');
        }}
      />
    </div>
  );
}
