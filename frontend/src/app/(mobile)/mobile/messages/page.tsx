'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { messagingApi } from '@/lib/api';
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

export default function MobileMessagesPage() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const loadConversations = useCallback(async () => {
        try {
            const res = await messagingApi.getConversations();
            setConversations(res.data || []);
        } catch { toast.error('Mesajlar yüklenemedi'); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const openConversation = async (conv: Conversation) => {
        setActiveConv(conv);
        setIsLoadingMsgs(true);
        try {
            const res = await messagingApi.getMessages(conv.id);
            setMessages(res.data || []);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch { toast.error('Mesajlar yüklenemedi'); }
        finally { setIsLoadingMsgs(false); }
    };

    const sendMessage = async () => {
        if (!draft.trim() || !activeConv) return;
        const text = draft.trim();
        setDraft('');
        setIsSending(true);
        try {
            await messagingApi.sendMessage(activeConv.id, text);
            const res = await messagingApi.getMessages(activeConv.id);
            setMessages(res.data || []);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch { toast.error('Mesaj gönderilemedi'); setDraft(text); }
        finally { setIsSending(false); }
    };

    const escalated = conversations.filter(c => c.status === 'HUMAN');
    const rest = conversations.filter(c => c.status !== 'HUMAN');

    // Conversation list
    if (!activeConv) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>💬 Mesajlar</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {escalated.length > 0 && (
                        <>
                            <div style={{ padding: '10px 16px 4px', fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', letterSpacing: '0.08em' }}>
                                🔴 ESKALE — {escalated.length} konuşma
                            </div>
                            {escalated.map(c => <ConvRow key={c.id} conv={c} onClick={() => openConversation(c)} escalated />)}
                        </>
                    )}
                    {rest.length > 0 && (
                        <>
                            <div style={{ padding: '10px 16px 4px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
                                DİĞER
                            </div>
                            {rest.map(c => <ConvRow key={c.id} conv={c} onClick={() => openConversation(c)} />)}
                        </>
                    )}
                    {conversations.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💬</div>
                            <div>Aktif konuşma yok</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Chat detail
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Chat header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'rgba(15,20,40,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
            }}>
                <button onClick={() => setActiveConv(null)} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '1.25rem', cursor: 'pointer', padding: 4 }}>‹</button>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                        {activeConv.patient ? `${activeConv.patient.firstName} ${activeConv.patient.lastName}` : activeConv.waPhone}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{activeConv.waPhone}</div>
                </div>
                {activeConv.status === 'HUMAN' && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>
                        ESKALELİ
                    </span>
                )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isLoadingMsgs ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Yükleniyor...</div>
                ) : (
                    messages.map(msg => {
                        const isOut = msg.direction === 'OUTBOUND';
                        return (
                            <div key={msg.id} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '78%', padding: '10px 14px', borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    background: isOut ? '#6366f1' : 'rgba(255,255,255,0.07)',
                                    color: isOut ? '#fff' : '#e2e8f0',
                                    fontSize: '0.875rem', lineHeight: 1.5,
                                }}>
                                    <div>{msg.body || '📎 Medya'}</div>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
                display: 'flex', gap: 8, padding: '10px 12px',
                background: 'rgba(15,20,40,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
            }}>
                <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Mesaj yaz..."
                    rows={1}
                    style={{
                        flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 20, padding: '10px 16px', color: '#e2e8f0', fontSize: '0.9rem',
                        resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                        maxHeight: 96, overflowY: 'auto',
                    }}
                />
                <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || isSending}
                    style={{
                        width: 44, height: 44, borderRadius: '50%', background: draft.trim() ? '#6366f1' : 'rgba(255,255,255,0.06)',
                        border: 'none', color: '#fff', fontSize: '1.1rem', cursor: draft.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s ease', flexShrink: 0, alignSelf: 'flex-end',
                    }}
                >▶</button>
            </div>
        </div>
    );
}

function ConvRow({ conv, onClick, escalated }: { conv: Conversation; onClick: () => void; escalated?: boolean }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '12px 16px', background: 'none', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.15s ease',
            }}
            onTouchStart={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onTouchEnd={e => (e.currentTarget.style.background = 'none')}
        >
            <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: escalated ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
            }}>
                {escalated ? '🔴' : '💬'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>
                        {conv.patient ? `${conv.patient.firstName} ${conv.patient.lastName}` : conv.waPhone}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0 }}>{timeAgo(conv.lastMessageAt)}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {escalated && conv.escalationReason ? `⚠️ ${conv.escalationReason}` : (conv.lastMessage?.body || 'Mesaj yok')}
                </div>
            </div>
            {(conv.unreadCount ?? 0) > 0 && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {conv.unreadCount}
                </div>
            )}
        </button>
    );
}
