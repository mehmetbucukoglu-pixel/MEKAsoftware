'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

/**
 * Global notification hook that listens for Socket.IO events
 * and displays real-time toast notifications for clinic staff.
 * 
 * Events:
 * - appointment_created: New WhatsApp appointment
 * - appointment_cancelled: Appointment cancelled
 * - new_message: New WhatsApp message received
 * - conversation_escalated: Patient escalation (Bekleyen Mesaj)
 * - escalation_resolved: Escalation cleared by staff reply
 */
export function useRealtimeNotifications() {
    const { user, clinic } = useAuthStore();

    useEffect(() => {
        if (!clinic?.id || !user?.id || !user?.role) return;

        const socket = getSocket(clinic.id, user.id, user.role);

        const handleAppNotification = (notif: any) => {
            // Unify system notifications from the DB
            let icon = '🔔';
            let color = 'var(--text-primary)';
            
            if (notif.type === 'ESCALATION') {
                icon = '🔴';
                color = 'var(--error)';
            } else if (notif.type === 'WORKSPACE_TASK') {
                icon = '📋';
                color = 'var(--primary)';
            } else if (notif.type === 'WORKSPACE_TEAMSPACE') {
                icon = '👥';
                color = 'var(--success)';
            }
            
            toast((t) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color }}>
                        {icon} {notif.title}
                    </div>
                    {notif.body && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {notif.body}
                        </div>
                    )}
                </div>
            ), { duration: 5000 });

            // Trigger global refetch for Bell icon
            window.dispatchEvent(new Event('app_notification_received'));
        };

        const handleAppointmentCreated = (data: any) => {
            const patientName = data?.patient
                ? `${data.patient.firstName} ${data.patient.lastName}`
                : 'Bir hasta';
            const time = data?.startTime
                ? new Date(data.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : '';

            toast((t) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>
                        📅 Yeni Randevu
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {patientName} {time ? `(${time})` : ''} için randevu oluşturuldu.
                    </div>
                </div>
            ), { duration: 4000 });
            window.dispatchEvent(new Event('app_notification_received'));
        };

        const handleAppointmentCancelled = (data: any) => {
            toast((t) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--error)' }}>
                        ❌ Randevu İptali
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Ref: {data?.referenceCode || 'Bilinmiyor'} iptal edildi.
                    </div>
                </div>
            ), { duration: 4000 });
            window.dispatchEvent(new Event('app_notification_received'));
        };

        const handleNewMessage = (data: any) => {
            const onMessagesPage = window.location.pathname.startsWith('/messages') ||
                window.location.pathname.startsWith('/mobile/messages');
            if (onMessagesPage) return; // mesajlar açıkken toast bastırma

            const sender = data?.patient
                ? `${data.patient.firstName} ${data.patient.lastName}`
                : data?.waPhone || 'Bilinmeyen';
            const preview = (data?.body || '').substring(0, 55);

            toast((t) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#10b981' }}>
                        💬 {sender}
                    </div>
                    {preview && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            {preview}{preview.length >= 55 ? '…' : ''}
                        </div>
                    )}
                </div>
            ), { duration: 4000 });
        };

        const handleEscalation = (data: any) => {
            // Escalation also creates a DB Notification, but we keep this for backwards compatibility
            // or we could just rely on handleAppNotification.
            // If the backend creates Notification, we might get duplicate toasts.
            // Let's rely on handleAppNotification for escalations since we just confirmed it creates one!
        };

        const handleEscalationResolved = () => {
            // Kept simple
            toast.success('Bekleyen mesaj yanıtlandı', { duration: 2000 });
        };

        // Bekleyen bildirimler temizlendi (bota geri al veya cevap verilince)
        const handleNotificationsCleared = (_data: { conversationId: string }) => {
            // Bell badge'ini anında yenile (desktop layout dinliyor)
            window.dispatchEvent(new Event('app_notification_received'));
        };

        socket.on('app_notification', handleAppNotification);
        socket.on('appointment_created', handleAppointmentCreated);
        socket.on('appointment_cancelled', handleAppointmentCancelled);
        socket.on('new_message', handleNewMessage);
        socket.on('escalation_resolved', handleEscalationResolved);
        socket.on('notifications_cleared', handleNotificationsCleared);

        return () => {
            socket.off('app_notification', handleAppNotification);
            socket.off('appointment_created', handleAppointmentCreated);
            socket.off('appointment_cancelled', handleAppointmentCancelled);
            socket.off('new_message', handleNewMessage);
            socket.off('escalation_resolved', handleEscalationResolved);
            socket.off('notifications_cleared', handleNotificationsCleared);
        };
    }, [clinic?.id, user?.id, user?.role]);
}
