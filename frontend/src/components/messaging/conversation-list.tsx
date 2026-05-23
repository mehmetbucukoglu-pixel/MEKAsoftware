'use client';

import { Search, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Conversation {
    id: string;
    waPhone: string;
    lastMessageAt: string | null;
    unreadCount: number;
    status: 'BOT' | 'HUMAN' | 'CLOSED';
    escalationReason?: string | null;
    patient?: {
        firstName: string;
        lastName: string;
    };
}

interface ConversationListProps {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
    const getBadgeStyle = (conv: Conversation) => {
        if (conv.escalationReason === 'Yeni Ön-Kayıt') return { bg: 'var(--info-muted, #e0f2fe)', text: 'var(--info, #0284c7)', label: 'Yeni Hasta', icon: '🆕' };
        if (conv.status === 'HUMAN' && conv.escalationReason) return { bg: 'var(--error-muted)', text: 'var(--error)', label: 'Bekleyen Mesaj', icon: '🔴' };
        if (conv.status === 'HUMAN') return { bg: 'var(--warning-muted)', text: 'var(--warning)', label: 'HUMAN', icon: '👤' };
        return { bg: 'var(--primary-muted)', text: 'var(--primary)', label: 'BOT', icon: '🤖' };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Mesajlarda ara..."
                        style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-elevated)',
                            fontSize: '0.875rem'
                        }}
                    />
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {conversations.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '0.875rem' }}>Konuşma bulunamadı</p>
                    </div>
                ) : (
                    conversations.map((conv) => {
                        const badge = getBadgeStyle(conv);
                        return (
                            <div
                                key={conv.id}
                                onClick={() => onSelect(conv.id)}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--border)',
                                    background: selectedId === conv.id ? 'var(--primary-muted)' : 'transparent',
                                    display: 'flex',
                                    gap: '12px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedId !== conv.id) e.currentTarget.style.background = 'var(--bg-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedId !== conv.id) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: 'var(--radius-full)',
                                    background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <User size={20} style={{ color: 'var(--text-muted)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {conv.patient ? `${conv.patient.firstName} ${conv.patient.lastName}` : conv.waPhone}
                                        </span>
                                        {conv.lastMessageAt && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false, locale: tr })}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: badge.bg,
                                                color: badge.text,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <span>{badge.icon}</span> {badge.label}
                                            </span>
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span style={{
                                                background: 'var(--primary)', color: '#fff', borderRadius: '10px',
                                                padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600
                                            }}>
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

