'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { appointmentApi } from '@/lib/api';
import toast from 'react-hot-toast';

type Appointment = {
    id: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    status: string;
    patient: { id: string; firstName: string; lastName: string; phone: string };
    doctor: { firstName: string; lastName: string };
    notes?: string;
};

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
    return date.toLocaleDateString('tr-TR', opts);
}
function fmtTime(date: Date) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLOR: Record<string, string> = {
    CONFIRMED: '#6366f1',
    ARRIVED: '#10b981',
    COMPLETED: '#22c55e',
    CANCELLED: '#ef4444',
    NO_SHOW: '#f59e0b',
};
const STATUS_LABEL: Record<string, string> = {
    CONFIRMED: 'Onaylı', ARRIVED: 'Geldi', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal', NO_SHOW: 'Gelmedi',
};

export default function MobileCalendarPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
    const [showQuickBook, setShowQuickBook] = useState(false);
    const [qbStep, setQbStep] = useState<1 | 2 | 3>(1);
    const [qbDate, setQbDate] = useState('');
    const [qbSlots, setQbSlots] = useState<{ startTime: string; endTime: string; available: boolean }[]>([]);
    const [qbSlot, setQbSlot] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dateStr = selectedDate.toISOString().split('T')[0];

    const loadAppointments = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await appointmentApi.list({ date: dateStr, doctorId: user?.role === 'DOCTOR' ? user.id : undefined });
            setAppointments(res.data || []);
        } catch { toast.error('Randevular yüklenemedi'); }
        finally { setIsLoading(false); }
    }, [dateStr, user]);

    useEffect(() => { loadAppointments(); }, [loadAppointments]);

    const goDay = (delta: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + delta);
        setSelectedDate(d);
    };

    const loadSlots = async (date: string) => {
        if (!user || !selectedApt) return;
        try {
            const doctorId = selectedApt.doctor ? user.id : user.id;
            const res = await appointmentApi.availableSlots(doctorId, date);
            setQbSlots(res.data || []);
        } catch { setQbSlots([]); }
    };

    const handleQuickBook = (apt: Appointment) => {
        setSelectedApt(apt);
        setQbStep(1);
        setQbDate('');
        setQbSlots([]);
        setQbSlot('');
        setShowQuickBook(true);
        setSelectedApt(null);
        setSelectedApt(apt);
    };

    const handleQbDateSelect = async (date: string) => {
        setQbDate(date);
        setQbStep(2);
        await loadSlots(date);
    };

    const handleQbSlotSelect = (slot: string) => {
        setQbSlot(slot);
        setQbStep(3);
    };

    const handleQbConfirm = async () => {
        if (!selectedApt || !qbDate || !qbSlot) return;
        setIsSubmitting(true);
        try {
            const [h, m] = qbSlot.split(':').map(Number);
            const startDateTime = new Date(qbDate);
            startDateTime.setHours(h, m, 0, 0);
            await appointmentApi.create({
                doctorId: user!.id,
                patientId: selectedApt.patient.id,
                startTime: startDateTime.toISOString(),
                durationMin: 60,
                notes: `Tekrar randevu — önceki: ${fmtTime(new Date(selectedApt.startTime))}`,
            });
            toast.success('Randevu oluşturuldu! 🎉');
            navigator.vibrate?.([100, 50, 100]);
            setShowQuickBook(false);
            loadAppointments();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Randevu oluşturulamadı');
        } finally { setIsSubmitting(false); }
    };

    // Mini calendar date chips for week
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1 + i); // Mon-Sun
        return d;
    });

    // Next 30 days for quick book step 1
    const next30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d;
    }).filter(d => d.getDay() !== 0); // no Sundays

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                background: 'rgba(99,102,241,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 16px 0',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <button onClick={() => goDay(-1)} style={navBtn}>‹</button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {fmt(selectedDate, { weekday: 'long' })}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {fmt(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <button onClick={() => goDay(1)} style={navBtn}>›</button>
                </div>

                {/* Week chips */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
                    {weekDays.map(d => {
                        const isSelected = d.toDateString() === selectedDate.toDateString();
                        const isToday = d.toDateString() === new Date().toDateString();
                        return (
                            <button
                                key={d.toDateString()}
                                onClick={() => setSelectedDate(new Date(d))}
                                style={{
                                    flexShrink: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    padding: '8px 12px', borderRadius: 12,
                                    background: isSelected ? '#6366f1' : isToday ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${isSelected ? '#6366f1' : isToday ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                    cursor: 'pointer', color: isSelected ? '#fff' : '#cbd5e1',
                                    minWidth: 44, transition: 'all 0.2s ease',
                                }}
                            >
                                <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.8 }}>
                                    {fmt(d, { weekday: 'short' }).toUpperCase()}
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 700 }}>{d.getDate()}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Appointments list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ height: 72, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
                    ))
                ) : appointments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
                        <div style={{ fontWeight: 600 }}>Bu gün randevu yok</div>
                    </div>
                ) : (
                    appointments.map(apt => {
                        const start = new Date(apt.startTime);
                        const end = new Date(apt.endTime);
                        const color = STATUS_COLOR[apt.status] || '#6366f1';
                        return (
                            <button
                                key={apt.id}
                                onClick={() => setSelectedApt(apt)}
                                style={{
                                    display: 'flex', alignItems: 'stretch', gap: 12,
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 14, padding: '14px 14px 14px 0',
                                    cursor: 'pointer', textAlign: 'left', width: '100%',
                                    transition: 'transform 0.15s ease, background 0.15s ease',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                                onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                                onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                <div style={{ width: 4, borderRadius: '0 4px 4px 0', background: color, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                                            {apt.patient.firstName} {apt.patient.lastName}
                                        </span>
                                        <span style={{
                                            fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
                                            borderRadius: 999, background: `${color}20`, color,
                                        }}>
                                            {STATUS_LABEL[apt.status]}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                        {fmtTime(start)} – {fmtTime(end)} · {apt.durationMin}dk
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
                <style>{`
                  @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
                `}</style>
            </div>

            {/* Appointment Detail Bottom Sheet */}
            {selectedApt && !showQuickBook && (
                <BottomSheet onClose={() => setSelectedApt(null)}>
                    <div style={{ padding: '0 20px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 4 }}>
                            {selectedApt.patient.firstName} {selectedApt.patient.lastName}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: 20 }}>
                            {fmtTime(new Date(selectedApt.startTime))} – {fmtTime(new Date(selectedApt.endTime))}
                            {' · '}{selectedApt.durationMin}dk
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <a
                                href={`tel:${selectedApt.patient.phone}`}
                                style={{ ...actionBtn, background: 'rgba(16,185,129,0.12)', color: '#10b981', textDecoration: 'none', flex: 1 }}
                            >📞 Ara</a>
                            <button
                                onClick={() => { router.push(`/mobile/messages?phone=${selectedApt.patient.phone}`); }}
                                style={{ ...actionBtn, background: 'rgba(99,102,241,0.12)', color: '#818cf8', flex: 1 }}
                            >💬 Mesaj</button>
                        </div>
                        <button
                            onClick={() => { handleQuickBook(selectedApt!); }}
                            style={{ ...primaryBtn, width: '100%', marginTop: 12 }}
                        >
                            ⚡ Bu Hastaya Yeni Randevu Al
                        </button>
                    </div>
                </BottomSheet>
            )}

            {/* Quick Book Bottom Sheet */}
            {showQuickBook && selectedApt && (
                <BottomSheet onClose={() => setShowQuickBook(false)} tall>
                    <div style={{ padding: '0 20px 20px' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>⚡ Hızlı Randevu</div>
                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: 20 }}>
                            {selectedApt.patient.firstName} {selectedApt.patient.lastName}
                        </div>

                        {/* Step indicator */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                            {[1, 2, 3].map(s => (
                                <div key={s} style={{
                                    height: 3, flex: 1, borderRadius: 2,
                                    background: s <= qbStep ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                    transition: 'background 0.3s ease',
                                }} />
                            ))}
                        </div>

                        {/* Step 1: Date */}
                        {qbStep === 1 && (
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.875rem', color: '#94a3b8' }}>
                                    1. Tarih seç
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {next30.map(d => {
                                        const ds = d.toISOString().split('T')[0];
                                        const isSat = d.getDay() === 6;
                                        return (
                                            <button
                                                key={ds}
                                                onClick={() => handleQbDateSelect(ds)}
                                                style={{
                                                    padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                                                    background: isSat ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.04)',
                                                    color: '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                <span style={{ opacity: 0.7, fontSize: '0.7rem', display: 'block' }}>
                                                    {fmt(d, { weekday: 'short' })}
                                                </span>
                                                {d.getDate()} {fmt(d, { month: 'short' })}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Slot */}
                        {qbStep === 2 && (
                            <div>
                                <button onClick={() => setQbStep(1)} style={backBtn}>← Geri</button>
                                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.875rem', color: '#94a3b8' }}>
                                    2. Saat seç — {qbDate}
                                </div>
                                {qbSlots.length === 0 ? (
                                    <div style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>
                                        📅 Bu gün için uygun slot bulunamadı.<br />
                                        <small>Farklı bir gün seçin.</small>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {qbSlots.filter(s => s.available).map((s, i) => {
                                            const t = new Date(s.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleQbSlotSelect(t)}
                                                    style={{
                                                        padding: '10px 18px', borderRadius: 10,
                                                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                                                        color: '#818cf8', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >{t}</button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Confirm */}
                        {qbStep === 3 && (
                            <div>
                                <button onClick={() => setQbStep(2)} style={backBtn}>← Geri</button>
                                <div style={{ fontWeight: 600, marginBottom: 16, fontSize: '0.875rem', color: '#94a3b8' }}>
                                    3. Onayla
                                </div>
                                <div style={{
                                    background: 'rgba(99,102,241,0.08)', borderRadius: 14,
                                    padding: 16, marginBottom: 20, border: '1px solid rgba(99,102,241,0.2)'
                                }}>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
                                        {selectedApt.patient.firstName} {selectedApt.patient.lastName}
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>📅 {qbDate}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>🕐 {qbSlot} (60 dakika)</div>
                                </div>
                                <button
                                    onClick={handleQbConfirm}
                                    disabled={isSubmitting}
                                    style={{ ...primaryBtn, width: '100%', opacity: isSubmitting ? 0.6 : 1 }}
                                >
                                    {isSubmitting ? 'Oluşturuluyor...' : '✓ Randevuyu Oluştur'}
                                </button>
                            </div>
                        )}
                    </div>
                </BottomSheet>
            )}
        </div>
    );
}

function BottomSheet({ children, onClose, tall }: { children: React.ReactNode; onClose: () => void; tall?: boolean }) {
    return (
        <>
            <div
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, animation: 'fadeIn 0.2s ease' }}
            />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
                background: '#111827', borderRadius: '20px 20px 0 0',
                maxHeight: tall ? '88svh' : '60svh', overflowY: 'auto',
                animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                </div>
                {children}
            </div>
            <style>{`
              @keyframes fadeIn { from{opacity:0} to{opacity:1} }
              @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
            `}</style>
        </>
    );
}

const navBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '1.25rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
    padding: '14px 20px', borderRadius: 12, background: '#6366f1', border: 'none',
    color: '#fff', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
    transition: 'opacity 0.2s ease',
};
const actionBtn: React.CSSProperties = {
    padding: '12px', borderRadius: 10, border: 'none', fontWeight: 600,
    fontSize: '0.875rem', cursor: 'pointer', textAlign: 'center', display: 'block',
};
const backBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: '#6366f1', fontSize: '0.875rem',
    cursor: 'pointer', padding: '0 0 12px', fontWeight: 600,
};
