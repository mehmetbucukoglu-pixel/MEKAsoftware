'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { doctorScheduleApi, DoctorSchedule } from '@/lib/api';
import { Clock, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DAYS = [
    { value: 0, label: 'Pazartesi' },
    { value: 1, label: 'Salı' },
    { value: 2, label: 'Çarşamba' },
    { value: 3, label: 'Perşembe' },
    { value: 4, label: 'Cuma' },
    { value: 5, label: 'Cumartesi' },
    { value: 6, label: 'Pazar' },
];

export default function ScheduleSettingsPage() {
    const { user, isDoctor } = useAuthStore();
    const [schedules, setSchedules] = useState<Partial<DoctorSchedule>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user || (!isDoctor() && user.role !== 'ADMIN')) return;

        let doctorIdToFetch = user.id; // Varsayılan olarak kendi ID'si
        // İleride ADMIN başka doktorları seçebilirse burayı dropdown'a bağlarız

        const fetchSchedules = async () => {
            try {
                const res = await doctorScheduleApi.get(doctorIdToFetch);

                // Eğer DB'den boş dönerse veya eksik gün varsa doldur 
                const existing = res.data;
                const fullWeek = DAYS.map(d => {
                    const found = existing.find(s => s.dayOfWeek === d.value);
                    if (found) return found;

                    // Varsayılan boş şablon
                    return {
                        doctorId: doctorIdToFetch,
                        dayOfWeek: d.value,
                        startTime: '09:00',
                        endTime: '17:00',
                        breakStart: '12:00',
                        breakEnd: '13:00',
                        slotDuration: 30,
                        isActive: d.value < 5 // Hafta içi aktif, haftasonu pasif
                    };
                });

                setSchedules(fullWeek);
            } catch (error) {
                console.error('Schedule fetch error:', error);
                toast.error('Çalışma saatleri yüklenemedi');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedules();
    }, [user, isDoctor]);

    const handleUpdate = (dayIndex: number, field: keyof DoctorSchedule, value: any) => {
        setSchedules(prev => {
            const next = [...prev];
            next[dayIndex] = { ...next[dayIndex], [field]: value };
            return next;
        });
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await doctorScheduleApi.update(user.id, schedules);
            toast.success('Çalışma saatleri güncellendi');
        } catch (error) {
            console.error('Schedule save error:', error);
            toast.error('Çalışma saatleri kaydedilemedi');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                <Loader2 className="spin" size={32} style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    if (!isDoctor() && user?.role !== 'ADMIN') {
        return <div>Bu sayfayı görüntüleme yetkiniz yok.</div>;
    }

    return (
        <div style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={24} style={{ color: 'var(--primary)' }} />
                        Çalışma Saatleri
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                        Hastaların randevu alabileceği uygun saat dilimlerini belirleyin.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    <span style={{ marginLeft: '8px' }}>Kaydet</span>
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 100px 100px 100px 100px 80px 1fr',
                    gap: '12px',
                    padding: '16px',
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)'
                }}>
                    <div>Gün</div>
                    <div>Durum</div>
                    <div>Mesai Başlangıç</div>
                    <div>Mola Başlangıç</div>
                    <div>Mola Bitiş</div>
                    <div>Mesai Bitiş</div>
                    <div>Randevu Aralığı</div>
                </div>

                {schedules.map((schedule, i) => (
                    <div key={i} style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 100px 100px 100px 100px 80px 1fr',
                        gap: '12px',
                        padding: '16px',
                        alignItems: 'center',
                        borderBottom: i < schedules.length - 1 ? '1px solid var(--border)' : 'none',
                        opacity: schedule.isActive ? 1 : 0.6,
                        transition: 'opacity 0.2s',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }}>
                        <div style={{ fontWeight: 500 }}>
                            {DAYS.find(d => d.value === schedule.dayOfWeek)?.label}
                        </div>

                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={schedule.isActive}
                                    onChange={(e) => handleUpdate(i, 'isActive', e.target.checked)}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                />
                                <span style={{ fontSize: '0.875rem' }}>{schedule.isActive ? 'Çalışıyor' : 'İzinli'}</span>
                            </label>
                        </div>

                        <div>
                            <input
                                type="time"
                                className="input"
                                value={schedule.startTime}
                                onChange={(e) => handleUpdate(i, 'startTime', e.target.value)}
                                disabled={!schedule.isActive}
                                style={{ padding: '6px' }}
                            />
                        </div>

                        <div>
                            <input
                                type="time"
                                className="input"
                                value={schedule.breakStart || ''}
                                onChange={(e) => handleUpdate(i, 'breakStart', e.target.value)}
                                disabled={!schedule.isActive}
                                style={{ padding: '6px' }}
                            />
                        </div>

                        <div>
                            <input
                                type="time"
                                className="input"
                                value={schedule.breakEnd || ''}
                                onChange={(e) => handleUpdate(i, 'breakEnd', e.target.value)}
                                disabled={!schedule.isActive}
                                style={{ padding: '6px' }}
                            />
                        </div>

                        <div>
                            <input
                                type="time"
                                className="input"
                                value={schedule.endTime}
                                onChange={(e) => handleUpdate(i, 'endTime', e.target.value)}
                                disabled={!schedule.isActive}
                                style={{ padding: '6px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                className="select"
                                value={schedule.slotDuration}
                                onChange={(e) => handleUpdate(i, 'slotDuration', Number(e.target.value))}
                                disabled={!schedule.isActive}
                                style={{ padding: '6px', width: 'auto' }}
                            >
                                <option value={10}>10 dk</option>
                                <option value={15}>15 dk</option>
                                <option value={20}>20 dk</option>
                                <option value={30}>30 dk</option>
                                <option value={45}>45 dk</option>
                                <option value={60}>60 dk</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '16px', background: 'var(--primary-muted)', borderRadius: 'var(--radius-md)',
                color: 'var(--primary)'
            }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                    Mola saatlerini kullanmak istemiyorsanız, başlangıç ve bitiş alanlarını temiz bırakabilirsiniz.
                    Randevu aralığı, hastaların takvimde size ayırabileceği minimal zaman dilimini (slot) belirler.
                </p>
            </div>
        </div>
    );
}
