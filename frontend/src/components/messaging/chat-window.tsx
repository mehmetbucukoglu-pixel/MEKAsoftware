import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Bot, UserCheck, Check, CheckCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

interface Message {
    id: string;
    body: string | null;
    direction: 'INBOUND' | 'OUTBOUND';
    createdAt: string;
    status: string; // SENT, DELIVERED, READ, FAILED
    mediaUrl?: string | null;
    mediaType?: string | null;
}

interface ChatWindowProps {
    conversationId: string;
    messages: Message[];
    onSendMessage: (body: string) => void;
    onSwitchMode: (mode: 'BOT' | 'HUMAN') => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
    status: 'BOT' | 'HUMAN' | 'CLOSED';
    patientName?: string;
    patientId?: string;
}

export function ChatWindow({
    conversationId,
    messages,
    onSendMessage,
    onSwitchMode,
    onLoadMore,
    hasMore,
    loadingMore,
    status,
    patientName,
    patientId
}: ChatWindowProps) {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom('smooth');
        }
    }, [messages.length]);

    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || !onLoadMore || !hasMore || loadingMore) return;

        if (scrollContainerRef.current.scrollTop === 0) {
            onLoadMore();
        }
    }, [onLoadMore, hasMore, loadingMore]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const renderStatusIcon = (status: string) => {
        switch (status) {
            case 'SENT':
                return <Check size={12} />;
            case 'DELIVERED':
                return <CheckCheck size={12} style={{ opacity: 0.6 }} />;
            case 'READ':
                return <CheckCheck size={12} style={{ color: '#34B7F1' }} />;
            case 'FAILED':
                return <span style={{ color: 'red' }}>!</span>;
            default:
                return null;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
            {/* Header */}
            <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <User style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div>
                        {patientId ? (
                            <Link
                                href={`/patients/${patientId}`}
                                style={{
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    textDecoration: 'none',
                                    display: 'block'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                            >
                                {patientName}
                            </Link>
                        ) : (
                            <div style={{ fontWeight: 600 }}>{patientName || 'Bilinmeyen Hasta'}</div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {status === 'HUMAN' ? 'Temsilci Tarafından Yanıtlanıyor' : 'Bot Devrede'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => onSwitchMode(status === 'BOT' ? 'HUMAN' : 'BOT')}
                        className={`btn btn-sm ${status === 'HUMAN' ? 'btn-ghost' : 'btn-primary'}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {status === 'BOT' ? <UserCheck size={14} /> : <Bot size={14} />}
                        {status === 'BOT' ? 'Müşteri Temsilcisine Aktar' : 'Botu Geri Devreye Al'}
                    </button>
                </div>
            </div>

            {/* Messages area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
                {loadingMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            alignSelf: msg.direction === 'INBOUND' ? 'flex-start' : 'flex-end',
                            maxWidth: '70%',
                        }}
                    >
                        <div style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-lg)',
                            background: msg.direction === 'INBOUND' ? 'var(--bg-surface)' : 'var(--primary)',
                            color: msg.direction === 'INBOUND' ? 'var(--text-primary)' : '#fff',
                            boxShadow: 'var(--shadow-sm)',
                            position: 'relative'
                        }}>
                            {msg.mediaUrl && (
                                <div style={{ marginBottom: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                    {msg.mediaType?.startsWith('image/') ? (
                                        <img src={msg.mediaUrl} alt="attachment" style={{ maxWidth: '100%', display: 'block' }} />
                                    ) : (
                                        <Link href={msg.mediaUrl} target="_blank" style={{ fontSize: '0.8rem', color: 'inherit' }}>
                                            Dosya Eki
                                        </Link>
                                    )}
                                </div>
                            )}
                            {msg.body && <div style={{ fontSize: '0.9375rem', lineHeight: 1.5 }}>{msg.body}</div>}
                            <div style={{
                                fontSize: '0.6875rem',
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '4px',
                                opacity: 0.8
                            }}>
                                {format(new Date(msg.createdAt), 'HH:mm', { locale: tr })}
                                {msg.direction === 'OUTBOUND' && renderStatusIcon(msg.status)}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '20px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Mesaj yazın..."
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-elevated)',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary btn-icon"
                        disabled={!inputText.trim()}
                        style={{ padding: '12px', borderRadius: 'var(--radius-md)' }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
