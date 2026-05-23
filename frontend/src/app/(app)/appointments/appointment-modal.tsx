'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { appointmentApi, patientApi, doctorScheduleApi, userApi, Patient, Appointment } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { X, Search, Clock, Calendar, FileText, Check, Loader2, AlertCircle, ExternalLink, MessageSquare, Trash2, Timer } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialDate?: Date | null;
    initialEndDate?: Date | null;
    existingAppointment?: Appointment | null;
}

export function AppointmentModal({ isOpen, onClose, onSuccess, initialDate, initialEndDate, existingAppointment }: AppointmentModalProps) {
    const { clinic, user } = useAuthStore();
    const router = useRouter();
    const isEdit = !!existingAppointment;

    // Form State
    const [patientId, setPatientId] = useState('');
    const [patientSearch, setPatientSearch] = useState('');
    const [patientsList, setPatientsList] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);

    const [doctorId, setDoctorId] = useState('');
    const [doctorsList, setDoctorsList] = useState<any[]>([]); // Mock array for now

    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [durationMin, setDurationMin] = useState(30);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<Appointment['status']>('CONFIRMED');
    const [cancelReason, setCancelReason] = useState('');

    const [availableSlots, setAvailableSlots] = useState<{ startTime: Date, endTime: Date, available: boolean }[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [conflictError, setConflictError] = useState('');

    // Load initial data
    useEffect(() => {
        if (!isOpen) return;

        // Reset state
        setConflictError('');
        setPatientSearch('');
        setPatientsList([]);

        // Fetch doctors
        if (user?.role === 'DOCTOR') {
            // Normal doctors only see themselves
            setDoctorsList([{ id: user.id, name: `${user.firstName} ${user.lastName}` }]);
            if (!existingAppointment) setDoctorId(user.id);
        } else {
            // Admins, Assistants etc. fetch all available doctors (which now includes admins)
            userApi.getDoctors().then(res => {
                const docs = Array.isArray(res.data.data) ? res.data.data : res.data;
                const formattedDocs = docs.map((d: any) => ({
                    id: d.id,
                    name: `${d.firstName} ${d.lastName}`
                }));
                setDoctorsList(formattedDocs);

                if (!existingAppointment) {
                    // Try to default to the logged-in user if they are in the list (e.g., an Admin who is also a doctor)
                    const currentUserDoc = formattedDocs.find((d: any) => d.id === user?.id);
                    if (currentUserDoc) {
                        setDoctorId(currentUserDoc.id);
                    } else if (formattedDocs.length > 0) {
                        setDoctorId(formattedDocs[0].id);
                    }
                }
            }).catch(err => {
                console.error('Doktor listesi çekilemedi', err);
            });
        }

        if (existingAppointment) {
            setPatientId(existingAppointment.patientId);
            if (existingAppointment.patient) setSelectedPatient(existingAppointment.patient);

            setDoctorId(existingAppointment.doctorId);
            const apptDate = new Date(existingAppointment.startTime);
            setDate(apptDate.toISOString().split('T')[0]);

            const hours = String(apptDate.getHours()).padStart(2, '0');
            const mins = String(apptDate.getMinutes()).padStart(2, '0');
            setStartTime(`${hours}:${mins}`);

            setDurationMin(existingAppointment.durationMin);
            setNotes(existingAppointment.notes || '');
            setStatus(existingAppointment.status);
            setCancelReason(existingAppointment.cancelReason || '');
        } else if (initialDate) {
            setDate(initialDate.toISOString().split('T')[0]);
            const hours = String(initialDate.getHours()).padStart(2, '0');
            const mins = String(initialDate.getMinutes()).padStart(2, '0');
            setStartTime(`${hours}:${mins}`);

            // Calculate duration from initialEndDate if available
            if (initialEndDate) {
                const diffMs = initialEndDate.getTime() - initialDate.getTime();
                const diffMins = Math.round(diffMs / 60000);
                // Fallback to 30 if diff is 0 (just a click, not a drag)
                setDurationMin(diffMins > 0 ? diffMins : 30);
            } else {
                setDurationMin(30);
            }

            setPatientId('');
            setSelectedPatient(null);
            setNotes('');
            setStatus('CONFIRMED');
        }
    }, [isOpen, existingAppointment, initialDate, initialEndDate, user]);

    // Patient search debounce
    useEffect(() => {
        if (!isOpen || isEdit || !patientSearch || patientSearch.length < 2) {
            setPatientsList([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingPatient(true);
            try {
                const res = await patientApi.list({ search: patientSearch, limit: 10 });
                setPatientsList(res.data.data);
            } catch (error) {
                console.error('Hasta arama hatası', error);
            } finally {
                setIsSearchingPatient(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [patientSearch, isOpen, isEdit]);

    // Fetch available slots
    const fetchSlots = useCallback(async () => {
        if (!doctorId || !date) return;
        setIsLoadingSlots(true);
        try {
            const res = await appointmentApi.availableSlots(doctorId, date);
            setAvailableSlots(res.data);
        } catch (error) {
            console.error('Slot çekme hatası', error);
        } finally {
            setIsLoadingSlots(false);
        }
    }, [doctorId, date]);

    useEffect(() => {
        // Wait until doctors list is loaded if we are expecting one
        // (if user is doctor, doctorsList will have length 1 quickly. If fetched, it takes time)
        // If it's edit mode, doctorId is set, fetchSlots relies on it.
        if (isOpen && doctorId && date) {
            fetchSlots();
        }
    }, [isOpen, doctorId, date, fetchSlots]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId || !doctorId || !date || !startTime) {
            toast.error('Lütfen zorunlu alanları doldurun');
            return;
        }

        setIsSubmitting(true);
        setConflictError('');

        try {
            const [hours, mins] = startTime.split(':').map(Number);
            const startDateTime = new Date(date);
            startDateTime.setHours(hours, mins, 0, 0);

            if (isEdit) {
                await appointmentApi.update(existingAppointment.id, {
                    startTime: startDateTime.toISOString(),
                    durationMin,
                    notes,
                });

                if (status !== existingAppointment.status) {
                    await appointmentApi.updateStatus(existingAppointment.id, status, cancelReason);
                }

                toast.success('Randevu güncellendi');
            } else {
                const payload = {
                    doctorId,
                    patientId,
                    startTime: startDateTime.toISOString(),
                    durationMin,
                    notes,
                };
                console.log("🔥 [FRONTEND_CREATE_PAYLOAD] Sending to API:", payload);
                await appointmentApi.create(payload);
                toast.success('Randevu başarıyla oluşturuldu');
            }
            onSuccess();
        } catch (error: any) {
            console.error("🔥 [FRONTEND_CREATE_ERROR] Full error details:", error);
            console.error("🔥 [FRONTEND_CREATE_ERROR] Response data:", error.response?.data);

            if (error.response?.status === 409) {
                setConflictError('Bu saat diliminde doktorun başka bir randevusu var. Lütfen çakışmayan bir saat seçin.');
            } else {
                toast.error('Randevu kaydedilirken bir hata oluştu: ' + (error.response?.data?.message || error.message));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!existingAppointment || !window.confirm('Bu randevuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
        setIsSubmitting(true);
        try {
            await appointmentApi.remove(existingAppointment.id);
            toast.success('Randevu başarıyla silindi');
            onSuccess();
        } catch (error: any) {
            toast.error('Silinirken hata oluştu: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '600px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', padding: 0,
                boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={22} style={{ color: 'var(--primary)' }} />
                        {isEdit ? 'Randevu Detayı' : 'Yeni Randevu Oluştur'}
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {conflictError && (
                        <div style={{
                            padding: '12px 16px', background: 'var(--error-muted)', color: 'var(--error)',
                            borderRadius: 'var(--radius-md)', display: 'flex', gap: '10px', alignItems: 'flex-start',
                            marginBottom: '20px'
                        }}>
                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ fontSize: '0.875rem' }}>{conflictError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Doktor Seçimi (Eğer kullanıcı admin vs ise) */}
                        {user?.role !== 'DOCTOR' && doctorsList.length > 0 && (
                            <div className="form-group">
                                <label className="label">Doktor <span style={{ color: 'var(--error)' }}>*</span></label>
                                <select className="select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required disabled={isEdit}>
                                    {doctorsList.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Hasta Seçimi */}
                        <div className="form-group">
                            <label className="label">Hasta <span style={{ color: 'var(--error)' }}>*</span></label>

                            {isEdit || selectedPatient ? (
                                <div style={{
                                    padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ fontWeight: 500 }}>
                                        {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Yükleniyor...'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {isEdit && selectedPatient && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => { onClose(); router.push(`/patients/${selectedPatient.id}`); }}
                                                    title="Hasta Profilini Aç"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                >
                                                    <ExternalLink size={15} />
                                                </button>
                                                {selectedPatient.phone && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { onClose(); router.push(`/messages?phone=${selectedPatient.phone}`); }}
                                                        title="Mesajları Aç"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <MessageSquare size={15} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {!isEdit && (
                                            <button type="button" onClick={() => { setSelectedPatient(null); setPatientId(''); }} className="btn-icon" style={{ padding: '4px' }}>
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        className="input"
                                        placeholder="Hasta Ara (İsim veya TC)..."
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        style={{ paddingLeft: '36px' }}
                                    />
                                    {isSearchingPatient && (
                                        <Loader2 size={16} className="spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    )}

                                    {patientsList.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                                            background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            zIndex: 10, maxHeight: '200px', overflowY: 'auto'
                                        }}>
                                            {patientsList.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedPatient(p);
                                                        setPatientId(p.id);
                                                        setPatientsList([]);
                                                        setPatientSearch('');
                                                    }}
                                                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: 500 }}>{p.firstName} {p.lastName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.phone}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Zaman & Süre Seçimi */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label className="label">Tarih <span style={{ color: 'var(--error)' }}>*</span></label>
                                <input
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Saat & Süre <span style={{ color: 'var(--error)' }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px' }}>
                                    <input
                                        type="time"
                                        className="input"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                        style={{ colorScheme: 'dark', padding: '10px' }}
                                    />
                                    <select className="select" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
                                        {Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map(min => (
                                            <option key={min} value={min}>
                                                {min >= 60 ? `${Math.floor(min / 60)} saat ${min % 60 > 0 ? `${min % 60} dk` : ''}` : `${min} dk`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Müsait Slotlar Önerisi */}
                        {!isEdit && doctorId && date && (
                            <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Timer size={16} style={{ color: 'var(--primary)' }} /> Müsait Saat Dilimleri
                                </div>
                                
                                {isLoadingSlots ? (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Saatler yükleniyor...</div>
                                ) : availableSlots.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {availableSlots.slice(0, 15).map((slot, i) => {
                                            const slotDate = new Date(slot.startTime);
                                            const timeStr = `${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`;
                                            const isSelected = startTime === timeStr;

                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => {
                                                        setStartTime(timeStr);
                                                        const diffMin = (new Date(slot.endTime).getTime() - slotDate.getTime()) / 60000;
                                                        setDurationMin(diffMin);
                                                    }}
                                                    disabled={!slot.available}
                                                    style={{
                                                        padding: '6px 12px', fontSize: '0.875rem', fontWeight: isSelected ? 600 : 500, borderRadius: 'var(--radius-sm)',
                                                        background: isSelected ? 'var(--primary)' : (slot.available ? 'rgba(255,255,255,0.03)' : 'var(--error-muted)'),
                                                        color: isSelected ? '#fff' : (slot.available ? 'var(--text-primary)' : 'var(--error)'),
                                                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                        cursor: slot.available ? 'pointer' : 'not-allowed',
                                                        opacity: slot.available ? 1 : 0.5,
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {timeStr}
                                                </button>
                                            );
                                        })}
                                        {availableSlots.length > 15 && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center', marginLeft: '8px' }}>
                                                +{availableSlots.length - 15} daha...
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                        Seçili tarihte doktorun uygun saat dilimi bulunamadı. Lütfen başka bir gün seçin veya manuel saat girin.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Durum Güncelleme (Sadece Edit Modunda) */}
                        {isEdit && (
                            <>
                                <div className="form-group">
                                    <label className="label">Oturum Durumu</label>
                                    <select className="select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                                        <option value="CONFIRMED">⏳ Bekliyor (Onaylandı)</option>
                                        <option value="COMPLETED">✅ Geldi / Tamamlandı</option>
                                        <option value="NO_SHOW">🔴 Gelmedi</option>
                                        <option value="CANCELLED">❌ İptal Edildi</option>
                                    </select>
                                </div>
                                {status === 'CANCELLED' && (
                                    <div className="form-group">
                                        <label className="label">İptal Sebebi (Opsiyonel)</label>
                                        <textarea
                                            className="textarea"
                                            rows={2}
                                            value={cancelReason}
                                            onChange={(e) => setCancelReason(e.target.value)}
                                            placeholder="Hasta iptal etti, doktor boş değil vb..."
                                        />
                                    </div>
                                )}
                            </>
                        )}



                    </form>
                </div>

                <div style={{
                    padding: '16px 24px', borderTop: '1px solid var(--border)',
                    background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
                }}>
                    <div>
                        {isEdit && (
                            <button 
                                type="button" 
                                className="btn btn-danger" 
                                onClick={handleDelete} 
                                disabled={isSubmitting}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Trash2 size={16} /> Sil
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                            İptal
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting || !patientId}>
                            {isSubmitting ? (
                                <><Loader2 size={16} className="spin" /> Kaydediliyor...</>
                            ) : (
                                <><Check size={16} /> {isEdit ? 'Güncelle' : 'Randevu Oluştur'}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
