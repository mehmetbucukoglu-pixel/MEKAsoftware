'use client';

import { useState, useEffect } from 'react';
import { Calendar, X, AlertCircle } from 'lucide-react';
import { AppointmentModal } from '../appointments/appointment-modal';
import api, { Appointment } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export function FollowUpPrompts() {
    const [missingFollowups, setMissingFollowups] = useState<Appointment[]>([]);
    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const fetchMissing = async () => {
        try {
            const res = await api.get('/appointments/missing-followups');
            setMissingFollowups(res.data);
        } catch (error) {
            console.error('Failed to fetch missing followups', error);
        }
    };

    useEffect(() => {
        fetchMissing();
    }, []);

    const handleDismiss = (id: string) => {
        setDismissed(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    };

    const handleOpenModal = (appt: Appointment) => {
        setSelectedAppt(appt);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        fetchMissing(); // refresh the list
    };

    const visiblePrompts = missingFollowups.filter(a => !dismissed.has(a.id));

    if (visiblePrompts.length === 0) return null;

    return (
        <>
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '350px' }}>
                {visiblePrompts.map(appt => (
                    <div key={appt.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid var(--primary-muted)', animation: 'slideIn 0.3s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-muted)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AlertCircle size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{appt.patient?.firstName} {appt.patient?.lastName}</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    Dünkü seansı tamamlandı. Sonraki seans için yeni randevu planlandı mı?
                                </div>
                            </div>
                            <button onClick={() => handleDismiss(appt.id)} className="btn-icon" style={{ padding: '4px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleDismiss(appt.id)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                                Gerek Yok
                            </button>
                            <button onClick={() => handleOpenModal(appt)} className="btn btn-primary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <Calendar size={14} /> Planla
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}} />

            {/* Modal for creating a new appointment based on the old one */}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                existingAppointment={selectedAppt ? {
                    ...selectedAppt,
                    id: '', // Empty ID means it's a NEW appointment in the modal, we just prepopulate patient/doctor!
                    status: 'CONFIRMED'
                } as any : null}
            />
        </>
    );
}
