import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bot, Send, UserCheck } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorCard, SkeletonRows } from '@/shared/ui';
import { formatTime } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/stores/auth';
import { useAssign, useConversations, useMarkRead, useMessages, useSendMessage } from '../hooks';
import type { AiState, ConversationOut } from '@/shared/api/types';

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

function ConversationRow({ conv, active, onClick }: {
  conv: ConversationOut;
  active: boolean;
  onClick: () => void;
}) {
  const name = conv.customer?.full_name ?? conv.customer?.username ?? 'Mijoz';
  return (
    <button
      onClick={onClick}
      className={`w-full border-b border-border px-4 py-3 text-left transition-colors last:border-0 ${
        active ? 'bg-accent-soft' : 'hover:bg-accent-soft'
      }`}
    >
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
      <div className="mt-1.5 flex gap-1.5">
        <Badge tone="muted">{conv.channel === 'telegram' ? 'Telegram' : 'Instagram'}</Badge>
        <Badge tone={conv.ai_state === 'handed_off' ? 'rose' : 'gold'}>
          {aiStateLabels[conv.ai_state]}
        </Badge>
      </div>
    </button>
  );
}

export default function InboxPage() {
  const { conversationId = '' } = useParams();
  const navigate = useNavigate();
  const conversations = useConversations();
  const messages = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkRead();
  const assign = useAssign(conversationId);
  const user = useAuthStore((s) => s.user);
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
      <Card className="grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 overflow-hidden p-0 md:grid-cols-[320px_1fr]">
        <div className={`overflow-y-auto border-r border-border ${conversationId ? 'hidden md:block' : ''}`}>
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
            />
          ))}
        </div>

        <div className={`flex min-w-0 flex-col ${conversationId ? '' : 'hidden md:flex'}`}>
          {!conversationId && (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState heading="Suhbat tanlang" hint="Chapdagi ro'yxatdan suhbatni oching" />
            </div>
          )}
          {conversationId && (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text">
                    {selected?.customer?.full_name ?? selected?.customer?.username ?? 'Mijoz'}
                  </p>
                  {selected && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Bot className="h-3.5 w-3.5" strokeWidth={1.5} /> {aiStateLabels[selected.ai_state]}
                    </p>
                  )}
                </div>
                {user && selected?.assigned_operator_id !== user.id && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={assign.isPending}
                    onClick={() => assign.mutate(user.id)}
                  >
                    <UserCheck className="h-4 w-4" strokeWidth={1.5} /> O'zimga olish
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.isPending && <SkeletonRows rows={5} />}
                {messages.data?.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                        m.direction === 'outgoing'
                          ? 'bg-accent-soft text-text'
                          : 'bg-surface-2 text-text'
                      }`}
                    >
                      {m.sender_type === 'ai' && (
                        <span className="mb-0.5 flex items-center gap-1 text-2xs font-semibold text-accent-ink">
                          <Bot className="h-3 w-3" strokeWidth={1.5} /> AI
                        </span>
                      )}
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className="mt-1 text-right text-2xs text-muted">{formatTime(m.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="flex gap-2 border-t border-border p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Xabar yozing..."
                  aria-label="Xabar"
                  className="flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent"
                />
                <Button onClick={send} disabled={!text.trim()} aria-label="Yuborish">
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
