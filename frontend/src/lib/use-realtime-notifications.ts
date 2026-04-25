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
 */
export function useRealtimeNotifications() {
    const { user, clinic } = useAuthStore();

    useEffect(() => {
        if (!clinic?.id || !user?.id || !user?.role) return;

        const socket = getSocket(clinic.id, user.id, user.role);

        const handleAppointmentCreated = (data: any) => {
            const patientName = data?.patient
                ? `${data.patient.firstName} ${data.patient.lastName}`
                : 'Bir hasta';
            const time = data?.startTime
                ? new Date(data.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : '';

            toast.success(`📅 ${patientName} yeni randevu aldı${time ? ` — ${time}` : ''}`, {
                duration: 5000,
                icon: '🔔',
            });
        };

        const handleAppointmentCancelled = (data: any) => {
            toast.error(`❌ Randevu iptal edildi: ${data?.referenceCode || ''}`, {
                duration: 5000,
            });
        };

        const handleNewMessage = (data: any) => {
            // Only show notification if not on messages page
            if (window.location.pathname !== '/messages') {
                const sender = data?.patient
                    ? `${data.patient.firstName} ${data.patient.lastName}`
                    : data?.waPhone || 'Bilinmeyen';

                toast(`💬 ${sender}: ${(data?.body || '').substring(0, 60)}...`, {
                    duration: 4000,
                    icon: '📱',
                });
            }
        };

        socket.on('appointment_created', handleAppointmentCreated);
        socket.on('appointment_cancelled', handleAppointmentCancelled);
        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('appointment_created', handleAppointmentCreated);
            socket.off('appointment_cancelled', handleAppointmentCancelled);
            socket.off('new_message', handleNewMessage);
        };
    }, [clinic?.id, user?.id, user?.role]);
}
