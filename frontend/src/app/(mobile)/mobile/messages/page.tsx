'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { messagingApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

type Conversation = {
    id: string;
    waPhone: string;
    status: string;
    escalationReason?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    patient?: { firstName: string; lastName: string };
    lastMessage?: { body: string };
};
type Message = { id: string; direction: string; body?: string; createdAt: string; contentType: string };

const PAGE_SIZE = 30;

function timeAgo(dateStr?: string) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'şimdi';
    if (m < 60) return `${m}dk`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}s`;
    return `${Math.floor(h / 24)}g`;
}

function initials(conv: Conversation) {
    if (conv.patient) return `${conv.patient.firstName[0]}${conv.patient.lastName[0]}`.toUpperCase();
    return conv.waPhone.slice(-2);
}

export default function MobileMessagesPage() {
    const { user, clinic } = useAuthStore();
    const searchParams = useSearchParams();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isHandingOver, setIsHandingOver] = useState(false);
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const loadConversations = useCallback(async () => {
        try {
            const res = await messagingApi.getConversations();
            return res.data || [];
        } catch {
            toast.error('Mesajlar yüklenemedi');
            return [];
        }
    }, []);

    // Initial load
    useEffect(() => {
        (async () => {
            setIsLoadingConvs(true);
            const convs = await loadConversations();
            setConversations(convs);
            setIsLoadingConvs(false);

            const phone = searchParams.get('phone');
            if (phone && convs.length > 0) {
                const clean = phone.replace(/\D/g, '');
                const match = convs.find((c: Conversation) =>
                    c.waPhone.replace(/\D/g, '') === clean
                );
                if (match) openConversation(match);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Socket — real-time
    useEffect(() => {
        if (!clinic?.id || !user?.id) return;
        const socket = getSocket(clinic.id, user.id, user.role);
        if (!socket) return;

        const onConvUpdated = (updated: any) => {
            setConversations(prev => {
                const idx = prev.findIndex(c => c.id === updated.id);
                if (idx === -1) return [updated, ...prev];
                const next = [...prev];
                next[idx] = { ...next[idx], ...updated };
                return next.sort((a, b) =>
                    new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
                );
            });
            // Update activeConv mode if it's the open one
            setActiveConv(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
        };

        const onNewMsg = (msg: Message) => {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        };

        socket.on('conversation_updated', onConvUpdated);
        socket.on('conversation_escalated', () => loadConversations().then(setConversations));
        socket.on('new_message', onNewMsg);

        return () => {
            socket.off('conversation_updated', onConvUpdated);
            socket.off('conversation_escalated');
            socket.off('new_message', onNewMsg);
        };
    }, [clinic?.id, user?.id, user?.role, loadConversations]);

    const openConversation = async (conv: Conversation) => {
        setActiveConv(conv);
        setCurrentPage(1);
        setHasMore(false);
        setIsLoadingMsgs(true);
        try {
            const res = await messagingApi.getMessages(conv.id, { limit: PAGE_SIZE, page: 1 });
            const raw: Message[] = res.data || [];
            const msgs = raw.slice().reverse();
            setMessages(msgs);
            setHasMore(raw.length === PAGE_SIZE);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80);
        } catch { toast.error('Mesajlar yüklenemedi'); }
        finally { setIsLoadingMsgs(false); }
        // Mark seen
        messagingApi.markSeen(conv.id).catch(() => {});
    };

    // Load older messages (lazy load)
    const loadMore = async () => {
        if (!activeConv || isLoadingMore) return;
        setIsLoadingMore(true);
        const nextPage = currentPage + 1;
        try {
            const res = await messagingApi.getMessages(activeConv.id, { limit: PAGE_SIZE, page: nextPage });
            const raw: Message[] = res.data || [];
            const older = raw.slice().reverse();
            // Prepend older messages, preserve scroll position
            const scrollEl = scrollRef.current;
            const prevScrollHeight = scrollEl?.scrollHeight ?? 0;
            setMessages(prev => [...older, ...prev]);
            setCurrentPage(nextPage);
            setHasMore(raw.length === PAGE_SIZE);
            // Restore scroll after prepend
            requestAnimationFrame(() => {
                if (scrollEl) {
                    scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight;
                }
            });
        } catch { toast.error('Daha eski mesajlar yüklenemedi'); }
        finally { setIsLoadingMore(false); }
    };

    const sendMessage = async () => {
        if (!draft.trim() || !activeConv) return;
        if (activeConv.status === 'BOT') return; // Güvenlik: bot modunda gönderim yok
        const text = draft.trim();
        setDraft('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsSending(true);
        try {
            await messagingApi.sendMessage(activeConv.id, text);
            // Optimistically add message
            const tempMsg: Message = {
                id: `temp_${Date.now()}`,
                direction: 'OUTBOUND',
                body: text,
                createdAt: new Date().toISOString(),
                contentType: 'TEXT',
            };
            setMessages(prev => [...prev, tempMsg]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            // Mesaj gönderince kırmızı badge'i temizle (escalationReason + unreadCount)
            messagingApi.markSeen(activeConv.id).catch(() => {});
            setActiveConv(prev => prev ? { ...prev, escalationReason: undefined, unreadCount: 0 } : prev);
            setConversations(prev =>
                prev.map(c => c.id === activeConv.id ? { ...c, escalationReason: undefined, unreadCount: 0 } : c)
            );
        } catch { toast.error('Mesaj gönderilemedi'); setDraft(text); }
        finally { setIsSending(false); }
    };

    // Handover: BOT → HUMAN
    const handleHandover = async () => {
        if (!activeConv) return;
        setIsHandingOver(true);
        try {
            const newMode = activeConv.status === 'HUMAN' ? 'BOT' : 'HUMAN';
            const assignedTo = newMode === 'HUMAN' ? user?.id : undefined;
            await messagingApi.setMode(activeConv.id, newMode, assignedTo);
            // Bota devredince kırmızılığı da temizle
            const clearEscalation = newMode === 'BOT';
            setActiveConv(prev => prev ? {
                ...prev,
                status: newMode,
                ...(clearEscalation ? { escalationReason: undefined, unreadCount: 0 } : {})
            } : prev);
            setConversations(prev =>
                prev.map(c => c.id === activeConv.id ? {
                    ...c,
                    status: newMode,
                    ...(clearEscalation ? { escalationReason: undefined, unreadCount: 0 } : {})
                } : c)
            );
            toast.success(newMode === 'HUMAN' ? '🙋 Sohbet devralındı' : '🤖 Bot moduna geçildi');
        } catch { toast.error('Mod değiştirilemedi'); }
        finally { setIsHandingOver(false); }
    };

    const handleTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDraft(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const isBot = activeConv?.status === 'BOT';
    // Kırmızı = HUMAN modu VE henüz cevap verilmemiş (escalationReason varsa)
    const escalated = conversations.filter(c => c.status === 'HUMAN' && !!c.escalationReason);
    const rest = conversations.filter(c => !(c.status === 'HUMAN' && !!c.escalationReason));
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    // ── Conversation list ──────────────────────────────────────────────
    if (!activeConv) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,14,26,0.95)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, flex: 1 }}>💬 Mesajlar</h2>
                        {totalUnread > 0 && (
                            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {totalUnread}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {isLoadingConvs ? (
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
                            ))}
                        </div>
                    ) : (
                        <>
                            {escalated.length > 0 && (
                                <>
                                    <div style={{ padding: '10px 16px 4px', fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', letterSpacing: '0.1em' }}>
                                        🔴 BEKLEYEN MESAJLAR — {escalated.length}
                                    </div>
                                    {escalated.map(c => <ConvRow key={c.id} conv={c} onClick={() => openConversation(c)} escalated />)}
                                </>
                            )}
                            {rest.length > 0 && (
                                <>
                                    <div style={{ padding: '10px 16px 4px', fontSize: '0.68rem', fontWeight: 700, color: '#475569', letterSpacing: '0.08em' }}>
                                        DİĞER KONUŞMALAR
                                    </div>
                                    {rest.map(c => <ConvRow key={c.id} conv={c} onClick={() => openConversation(c)} />)}
                                </>
                            )}
                            {conversations.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💬</div>
                                    <div style={{ fontWeight: 600 }}>Aktif konuşma yok</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: 6 }}>WhatsApp mesajları burada görünür</div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
            </div>
        );
    }

    // ── Chat detail ────────────────────────────────────────────────────
    const convName = activeConv.patient
        ? `${activeConv.patient.firstName} ${activeConv.patient.lastName}`
        : activeConv.waPhone;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Chat header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'rgba(10,14,26,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
            }}>
                <button
                    onClick={() => { setActiveConv(null); setMessages([]); }}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '1.5rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
                >‹</button>
                <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: isBot ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                    color: isBot ? '#818cf8' : '#ef4444',
                }}>
                    {initials(activeConv)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {convName}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: isBot ? '#818cf8' : '#f87171', fontWeight: 600 }}>
                        {isBot ? '🤖 Bot Modu' : '👤 İnsan Modu'}
                    </div>
                </div>

                {/* Handover Button */}
                <button
                    onClick={handleHandover}
                    disabled={isHandingOver}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: `1px solid ${isBot ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
                        background: isBot ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                        color: isBot ? '#f87171' : '#818cf8',
                        fontSize: '0.72rem', fontWeight: 700,
                        cursor: isHandingOver ? 'default' : 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        opacity: isHandingOver ? 0.6 : 1,
                    }}
                >
                    {isHandingOver ? '⏳' : isBot ? '🙋 Devral' : '🤖 Bota Ver'}
                </button>
            </div>

            {/* Messages scroll area */}
            <div
                ref={scrollRef}
                style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}
            >
                {/* Lazy load more button */}
                {hasMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <button
                            onClick={loadMore}
                            disabled={isLoadingMore}
                            style={{
                                padding: '8px 16px', borderRadius: 20,
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.25)',
                                color: '#818cf8', fontSize: '0.78rem', fontWeight: 600,
                                cursor: isLoadingMore ? 'default' : 'pointer',
                                opacity: isLoadingMore ? 0.6 : 1,
                            }}
                        >
                            {isLoadingMore ? '⏳ Yükleniyor...' : '⬆ Daha eski mesajları görüntüle'}
                        </button>
                    </div>
                )}

                {isLoadingMsgs ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{
                                height: 44, width: `${40 + (i % 3) * 20}%`, borderRadius: 14,
                                background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite',
                                alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
                            }} />
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: '0.875rem' }}>
                        Henüz mesaj yok
                    </div>
                ) : (
                    messages.map(msg => {
                        const isOut = msg.direction === 'OUTBOUND';
                        const time = new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div key={msg.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '80%', padding: '10px 14px',
                                    borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    background: isOut ? '#6366f1' : 'rgba(255,255,255,0.07)',
                                    color: isOut ? '#fff' : '#e2e8f0',
                                    fontSize: '0.875rem', lineHeight: 1.5,
                                }}>
                                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {msg.body || '📎 Medya'}
                                    </div>
                                    <div style={{ fontSize: '0.62rem', opacity: 0.55, marginTop: 4, textAlign: 'right' }}>
                                        {time}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Escalation reason banner */}
            {activeConv.escalationReason && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', borderTop: '1px solid rgba(239,68,68,0.2)',
                    padding: '8px 16px', fontSize: '0.78rem', color: '#fca5a5',
                }}>
                    ⚠️ {activeConv.escalationReason}
                </div>
            )}

            {/* Bot mode blocker */}
            {isBot ? (
                <div style={{
                    padding: '14px 16px',
                    background: 'rgba(99,102,241,0.06)',
                    borderTop: '1px solid rgba(99,102,241,0.15)',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        🤖 Bot aktif — mesaj göndermek için sohbeti devral
                    </span>
                    <button
                        onClick={handleHandover}
                        style={{
                            padding: '6px 14px', borderRadius: 20,
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        🙋 Devral
                    </button>
                </div>
            ) : (
                /* Input area — only when HUMAN mode */
                <div style={{
                    display: 'flex', gap: 8, padding: '10px 12px',
                    background: 'rgba(10,14,26,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(20px)',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
                    alignItems: 'flex-end',
                }}>
                    <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={handleTextarea}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Mesaj yaz..."
                        rows={1}
                        style={{
                            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 20, padding: '10px 16px', color: '#e2e8f0', fontSize: '0.9rem',
                            resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                            maxHeight: 120, overflowY: 'auto', transition: 'border-color 0.2s ease',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!draft.trim() || isSending}
                        style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: draft.trim() && !isSending ? '#6366f1' : 'rgba(255,255,255,0.06)',
                            border: 'none', color: '#fff', fontSize: '1.1rem',
                            cursor: draft.trim() ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s ease', flexShrink: 0,
                        }}
                    >
                        {isSending ? '⏳' : '▶'}
                    </button>
                </div>
            )}
            <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
        </div>
    );
}

function ConvRow({ conv, onClick, escalated }: { conv: Conversation; onClick: () => void; escalated?: boolean }) {
    const name = conv.patient
        ? `${conv.patient.firstName} ${conv.patient.lastName}`
        : conv.waPhone;
    const ini = initials(conv);

    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '12px 16px', background: 'none', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
                textAlign: 'left',
            }}
            onTouchStart={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onTouchEnd={e => (e.currentTarget.style.background = 'none')}
        >
            <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: escalated ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
                color: escalated ? '#f87171' : '#818cf8',
                border: escalated ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid rgba(99,102,241,0.2)',
            }}>
                {ini}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                        {name}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#475569', flexShrink: 0 }}>{timeAgo(conv.lastMessageAt)}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: escalated ? '#f87171' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {escalated && conv.escalationReason ? `⚠️ ${conv.escalationReason}` : (conv.lastMessage?.body || 'Mesaj yok')}
                </div>
            </div>
            {(conv.unreadCount ?? 0) > 0 && (
                <div style={{
                    minWidth: 20, height: 20, borderRadius: 999, background: '#ef4444',
                    color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, padding: '0 5px',
                }}>
                    {conv.unreadCount}
                </div>
            )}
        </button>
    );
}
