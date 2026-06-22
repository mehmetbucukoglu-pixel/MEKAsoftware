'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, AlertCircle, Calendar, UserRound } from 'lucide-react';
import { patientApi, Patient, CreatePatientInput, userApi } from '@/lib/api';
import { normalizePhoneForStorage } from '@/lib/format';

interface PatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patient?: Patient | null; // edit mode when provided
}

export default function PatientModal({ isOpen, onClose, onSuccess, patient }: PatientModalProps) {
    const [form, setForm] = useState<CreatePatientInput>({
        firstName: '',
        lastName: '',
        phone: '',
        phone2: '',
        email: '',
        address: '',
        dateOfBirth: '',
        gender: '',
        notes: '',
    });
    const [doctors, setDoctors] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<Patient | null>(null);
    const router = useRouter();

    const isEdit = !!patient;

    // Doktor listesini çek
    useEffect(() => {
        if (!isOpen) return;
        userApi.getDoctors().then((res: any) => {
            const list = res.data || [];
            setDoctors(list);
            // Tek doktor varsa otomatik seç
            if (list.length === 1 && !patient) setSelectedDoctorId(list[0].id);
        }).catch(() => {});
    }, [isOpen]);

    useEffect(() => {
        if (patient) {
            setForm({
                firstName: patient.firstName || '',
                lastName: patient.lastName || '',
                phone: patient.phone || '',
                phone2: (patient as any).phone2 || '',
                email: '',
                address: '',
                dateOfBirth: '',
                gender: '',
                notes: '',
            });
            setSelectedDoctorId((patient as any).metadata?.primaryDoctorId || '');
        } else {
            setForm({ firstName: '', lastName: '', phone: '', phone2: '', email: '', address: '', dateOfBirth: '', gender: '', notes: '' });
            if (doctors.length === 1) setSelectedDoctorId(doctors[0].id);
        }
        setErrors({});
        setSubmitError('');
        setPhoneWarning(null);
        setSuccessData(null);
    }, [patient, isOpen, doctors]);

    useEffect(() => {
        if (!isOpen || isEdit) return;

        async function checkDuplicate() {
            if (form.phone && form.phone.length > 5) {
                try {
                    const res = await patientApi.checkPhone(form.phone);
                    if (res.data.exists && (!isEdit || patient?.phone !== form.phone)) {
                        setPhoneWarning(`Bu telefon numarasıyla kayıtlı bir hasta zaten var: ${res.data.patientName}`);
                    } else {
                        setPhoneWarning(null);
                    }
                } catch {
                    setPhoneWarning(null);
                }
            } else {
                setPhoneWarning(null);
            }
        }

        const timer = setTimeout(checkDuplicate, 500);
        return () => clearTimeout(timer);
    }, [form.phone, isOpen, isEdit, patient]);

    if (!isOpen) return null;

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!form.firstName || form.firstName.length < 2) newErrors.firstName = 'Ad en az 2 karakter olmalıdır';
        if (!form.lastName || form.lastName.length < 2) newErrors.lastName = 'Soyad en az 2 karakter olmalıdır';
        if (!form.phone) newErrors.phone = 'Telefon zorunludur';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setSubmitError('');

        try {
            const payload: any = {
                firstName: form.firstName,
                lastName: form.lastName,
                phone: normalizePhoneForStorage(form.phone),
                address: '',
            };
            if (form.phone2) payload.phone2 = normalizePhoneForStorage((form as any).phone2);
            if (selectedDoctorId) payload.metadata = { primaryDoctorId: selectedDoctorId };

            if (isEdit && patient) {
                await patientApi.update(patient.id, payload);
                onSuccess();
                onClose();
            } else {
                const res = await patientApi.create(payload);
                setSuccessData(res.data);
                onSuccess();
            }
        } catch (err: any) {
            const msg = err.response?.data?.message;
            setSubmitError(Array.isArray(msg) ? msg.join(', ') : msg || 'Bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof CreatePatientInput, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEdit ? 'Hasta Düzenle' : 'Yeni Hasta'}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-md)',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {submitError && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 14px', marginBottom: '16px', borderRadius: 'var(--radius-md)',
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: 'var(--error)', fontSize: '0.8125rem',
                            }}>
                                <AlertCircle size={16} />
                                {submitError}
                            </div>
                        )}

                        {successData ? (
                            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-muted)',
                                    color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 16px'
                                }}>
                                    <Check size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Ekleme Başarılı</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                                    {successData.firstName} {successData.lastName} başarıyla eklendi.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            onClose();
                                            router.push(`/patients/${successData.id}`);
                                        }}
                                    >
                                        <UserRound size={18} /> Detaya Git
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            onClose();
                                            router.push(`/appointments?patientId=${successData.id}`);
                                        }}
                                    >
                                        <Calendar size={18} /> Randevu Ver
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="label">Ad *</label>
                                        <input
                                            className="input"
                                            value={form.firstName}
                                            onChange={(e) => handleChange('firstName', e.target.value)}
                                            placeholder="Adı"
                                        />
                                        {errors.firstName && <div className="form-error">{errors.firstName}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Soyad *</label>
                                        <input
                                            className="input"
                                            value={form.lastName}
                                            onChange={(e) => handleChange('lastName', e.target.value)}
                                            placeholder="Soyadı"
                                        />
                                        {errors.lastName && <div className="form-error">{errors.lastName}</div>}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="label">Telefon *</label>
                                        <input
                                            className="input"
                                            value={form.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            onFocus={(e) => {
                                                if (!e.target.value) handleChange('phone', '+90');
                                            }}
                                            onBlur={(e) => {
                                                if (e.target.value === '+90') handleChange('phone', '');
                                            }}
                                            placeholder="+905550001111"
                                        />
                                        {errors.phone && <div className="form-error">{errors.phone}</div>}
                                        {phoneWarning && (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px',
                                                fontSize: '0.8125rem', color: 'var(--warning)',
                                                background: 'rgba(var(--warning-rgb), 0.1)', padding: '6px 10px',
                                                borderRadius: 'var(--radius-sm)'
                                            }}>
                                                <AlertCircle size={14} />
                                                {phoneWarning}
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="label">
                                            Tel. 2
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 400 }}>
                                                (veli / 2. kişi)
                                            </span>
                                        </label>
                                        <input
                                            className="input"
                                            value={(form as any).phone2 || ''}
                                            onChange={(e) => handleChange('phone2' as any, e.target.value)}
                                            onFocus={(e) => {
                                                if (!e.target.value) handleChange('phone2' as any, '+90');
                                            }}
                                            onBlur={(e) => {
                                                if (e.target.value === '+90') handleChange('phone2' as any, '');
                                            }}
                                            placeholder="+905550002222"
                                        />
                                    </div>
                                </div>

                                    <label className="label">Adres</label>
                                    <textarea
                                        className="textarea"
                                        value={form.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        placeholder="İl, İlçe, Mahalle, Sokak, No"
                                        rows={2}
                                    />
                                    {errors.address && <div className="form-error">{errors.address}</div>}
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="label">Doğum Tarihi</label>
                                        <input
                                            className="input"
                                            type="date"
                                            value={form.dateOfBirth}
                                            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Cinsiyet</label>
                                        <select
                                            className="select"
                                            value={form.gender}
                                            onChange={(e) => handleChange('gender', e.target.value)}
                                        >
                                            <option value="">Seçiniz</option>
                                            <option value="MALE">Erkek</option>
                                            <option value="FEMALE">Kadın</option>
                                            <option value="OTHER">Diğer</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="label">Notlar</label>
                                    <textarea
                                        className="textarea"
                                        value={form.notes}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        placeholder="Alerji, kronik hastalık vb."
                                        rows={3}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            İptal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><div className="spinner" style={{ width: '16px', height: '16px' }} /> Kaydediliyor...</>
                            ) : (
                                <><Check size={16} /> {isEdit ? 'Güncelle' : 'Kaydet'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
