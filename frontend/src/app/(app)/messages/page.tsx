'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import { ConversationList } from '@/components/messaging/conversation-list';
import { ChatWindow } from '@/components/messaging/chat-window';
import toast from 'react-hot-toast';
import { PageHeader } from '@/lib/page-header';

export default function MessagesPage() {
    const { user, clinic } = useAuthStore();
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const activeConversation = conversations.find(c => c.id === selectedId);

    const searchParams = useSearchParams();
    const phoneParam = searchParams.get('phone');

    useEffect(() => {
        fetchConversations();
    }, [phoneParam]);

    useEffect(() => {
        if (clinic?.id && user?.id && user?.role) {
            const socket = getSocket(clinic.id, user.id, user.role);

            // Join the conversation room if one is selected
            if (selectedId) {
                socket.emit('join_conversation', { conversationId: selectedId });
            }

            const handleNewMessage = (message: any) => {
                if (message.conversationId === selectedId) {
                    setMessages(prev => {
                        // Avoid duplicates if real-time message already came through or was sent by us
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    });
                }
                fetchConversations();
            };

            const handleConversationUpdated = (updatedConv: any) => {
                setConversations(prev => {
                    const exists = prev.some(c => c.id === updatedConv.id);
                    if (!exists) {
                        // If it's a new conversation that wasn't in list, refresh list
                        fetchConversations();
                        return prev;
                    }
                    return prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c);
                });
            };

            socket.on('new_message', handleNewMessage);
            socket.on('conversation_updated', handleConversationUpdated);

            return () => {
                if (selectedId) {
                    socket.emit('leave_conversation', { conversationId: selectedId });
                }
                socket.off('new_message', handleNewMessage);
                socket.off('conversation_updated', handleConversationUpdated);
            };
        }
    }, [clinic?.id, user?.id, user?.role, selectedId]);

    useEffect(() => {
        if (selectedId) {
            setPage(1);
            setHasMore(true);
            fetchInitialMessages(selectedId);

            // Clear unread count + escalation badge when opening conversation
            api.patch(`/conversations/${selectedId}/mark-seen`).then(() => {
                // Update local state immediately so badge disappears
                setConversations(prev =>
                    prev.map(c => c.id === selectedId ? { ...c, unreadCount: 0, escalationReason: null } : c)
                );
            }).catch(() => {});
        }
    }, [selectedId]);

    const fetchConversations = async () => {
        try {
            const { data } = await api.get('/conversations');
            const sorted = [...data].sort((a: any, b: any) => {
                if (a.status === 'HUMAN' && b.status !== 'HUMAN') return -1;
                if (a.status !== 'HUMAN' && b.status === 'HUMAN') return 1;
                // Within same status group, sort by latest message
                return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
            });
            setConversations(sorted);

            if (phoneParam && !selectedId) {
                const cleanPhone = phoneParam.replace(/[^0-9]/g, '');
                const target = sorted.find((c: any) => 
                    (c.waPhone && c.waPhone.includes(cleanPhone)) || 
                    (c.patient?.phone && c.patient.phone.includes(cleanPhone))
                );
                if (target) setSelectedId(target.id);
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialMessages = async (id: string) => {
        setLoadingMessages(true);
        try {
            const { data } = await api.get(`/conversations/${id}`, { params: { page: 1, limit: 20 } });
            setMessages(data.reverse());
            if (data.length < 20) setHasMore(false);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const fetchMoreMessages = async () => {
        if (loadingMore || !hasMore || !selectedId) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const { data } = await api.get(`/conversations/${selectedId}`, { params: { page: nextPage, limit: 20 } });
            if (data.length < 20) setHasMore(false);
            if (data.length > 0) {
                setMessages(prev => [...data.reverse(), ...prev]);
                setPage(nextPage);
            }
        } catch (error) {
            console.error('Failed to load more messages', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSendMessage = async (body: string) => {
        if (!selectedId) return;
        try {
            const { data } = await api.post(`/conversations/${selectedId}/messages`, { body });
            // OPTIONAL: We could add it here for instant feedback, 
            // but the socket might beat us or we'll have a slight jump.
            // Let's rely on the socket for the single source of truth to avoid any "2x" issues
            // but if we want instant feedback, we keep it and let the socket deduplicate.
            setMessages(prev => {
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, data];
            });
        } catch (error) {
            toast.error('Mesaj gönderilemedi');
        }
    };

    const handleSwitchMode = async (mode: 'BOT' | 'HUMAN') => {
        if (!selectedId) return;
        try {
            await api.patch(`/conversations/${selectedId}/mode`, { mode, assignedTo: user?.id });
            toast.success(mode === 'HUMAN' ? 'Temsilci moduna geçildi' : 'Bot moduna geçildi');
            fetchConversations();
        } catch (error) {
            toast.error('Mod değiştirilemedi');
        }
    };

    const handleToggleLock = async (locked: boolean) => {
        if (!selectedId) return;
        try {
            await api.patch(`/conversations/${selectedId}/lock`, { locked });
            toast.success(locked ? 'Bot geçişi kilitlendi' : 'Bot geçiş kilidi açıldı');
            fetchConversations();
        } catch (error) {
            toast.error('Kilit durumu değiştirilemedi');
        }
    };

    if (loading) return <div>Yükleniyor...</div>;

    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
                {/* Header via Portal */}
                <PageHeader
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                            <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Mesajlar</h1>
                        </div>
                    }
                />

                <div className="card" style={{ flex: 1, padding: 0, display: 'flex', overflow: 'hidden' }}>
                    {/* Conversations Sidebar */}
                    <div style={{ width: '320px', minWidth: '320px' }}>
                        <ConversationList
                            conversations={conversations}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                        />
                    </div>

                    {/* Chat Area */}
                    <div style={{ flex: 1 }}>
                        {selectedId ? (
                            loadingMessages ? (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
                                </div>
                            ) : (
                                <ChatWindow
                                    conversationId={selectedId}
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    onSwitchMode={handleSwitchMode}
                                    onToggleLock={handleToggleLock}
                                    onLoadMore={fetchMoreMessages}
                                    hasMore={hasMore}
                                    loadingMore={loadingMore}
                                    status={activeConversation?.status || 'BOT'}
                                    humanModeAt={activeConversation?.humanModeAt}
                                    humanModeLocked={activeConversation?.humanModeLocked}
                                    lastOutboundAt={activeConversation?.lastOutboundAt}
                                    patientName={activeConversation?.patient ? `${activeConversation.patient.firstName} ${activeConversation.patient.lastName}` : activeConversation?.waPhone}
                                    patientId={activeConversation?.patientId}
                                    escalationReason={activeConversation?.escalationReason}
                                />
                            )
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="empty-state">
                                    <MessageSquare size={48} style={{ color: 'var(--text-muted)' }} />
                                    <h3>Mesajlaşmaya Başlayın</h3>
                                    <p>Sol taraftan bir görüşme seçin.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Suspense>
    );
}
