'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Edit2, Calendar, FileText, Phone, Mail,
    User, Cake, StickyNote, Clock, Loader2, CreditCard, MapPin,
    DollarSign, Plus, Info, ChevronsUp, ChevronsDown, MessageSquare
} from 'lucide-react';
import { patientApi, clinicalNoteApi, financeApi, Patient, ClinicalNote, Payment } from '@/lib/api';
import PatientModal from '../patient-modal';
import { PatientCanvas } from '@/components/patient/PatientCanvas';
import { addRecentPatient } from '@/lib/recent-patients';
import { formatPhone } from '@/lib/format';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuthStore } from '@/lib/auth-store';

type TabId = 'appointments' | 'notes' | 'payments';

export default function PatientDetailPage() {
    const router = useRouter();
    const params = useParams();
    const patientId = params.id as string;
    const { user } = useAuthStore();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [balance, setBalance] = useState<{ balance: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [infoOpen, setInfoOpen] = useState(true);

    // Visibility shortcuts
    const isDoctor = user?.role === 'DOCTOR';
    const isAccountant = user?.role === 'ACCOUNTANT';
    const isAdmin = user?.role === 'ADMIN';

    // Determine the initial active tab ONCE, not on every render
    const initialTab = useMemo<TabId>(() => {
        if (isAccountant) return 'payments';
        return 'appointments';
    }, [isAccountant]);
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);

    // Canvas note state
    const [canvasNoteId, setCanvasNoteId] = useState<string | null>(null);
    const canvasNoteIdRef = useRef<string | null>(null);
    const [canvasContent, setCanvasContent] = useState<string | undefined>(undefined);
    const [canvasLoading, setCanvasLoading] = useState(false);

    const fetchPatient = async () => {
        try {
            const { data } = await patientApi.get(patientId);
            setPatient(data);
        } catch {
            setPatient(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBalanceOrFinance = async () => {
        if (isDoctor) return; // Doctors don't see balance
        try {
            const res = await financeApi.getPatientBalance(patientId);
            setBalance(res.data);
        } catch (err) {
            console.error("Bakiye çekilemedi");
        }
    };

    const fetchCanvasNote = async () => {
        setCanvasLoading(true);
        try {
            const { data } = await clinicalNoteApi.list(patientId);
            const canvasNote = data.find((n: any) => n.title === '__canvas__');
            if (canvasNote) {
                setCanvasNoteId(canvasNote.id);
                canvasNoteIdRef.current = canvasNote.id;
                setCanvasContent(canvasNote.content);
            } else {
                setCanvasNoteId(null);
                canvasNoteIdRef.current = null;
                setCanvasContent(undefined);
            }
        } catch { }
        finally { setCanvasLoading(false); }
    };

    useEffect(() => {
        if (patientId) {
            fetchPatient();
            fetchBalanceOrFinance();
            fetchCanvasNote();
        }
    }, [patientId]);

    // Son görüntülenenlere ekle
    useEffect(() => {
        if (patient) {
            addRecentPatient(patient);
        }
    }, [patient]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleEditSuccess = () => {
        setToast({ type: 'success', message: 'Hasta güncellendi' });
        fetchPatient();
    };

    // Use ref-based approach to avoid re-creating the callback when canvasNoteId changes
    // This prevents PatientCanvas from re-mounting on every save
    const handleCanvasSave = useCallback(async (json: string) => {
        try {
            const noteId = canvasNoteIdRef.current;
            if (noteId) {
                await clinicalNoteApi.update(noteId, { content: json });
            } else {
                const { data } = await clinicalNoteApi.create({
                    patientId, title: '__canvas__', content: json, visibility: 'STAFF',
                });
                setCanvasNoteId(data.id);
                canvasNoteIdRef.current = data.id;
            }
        } catch { }
    }, [patientId]);

    const genderLabel = (g?: string | null) => {
        if (g === 'MALE') return 'Erkek';
        if (g === 'FEMALE') return 'Kadın';
        if (g === 'OTHER') return 'Diğer';
        return '—';
    };

    const statusLabel = (s: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            CONFIRMED: { label: 'Onaylı', cls: 'badge-success' },
            COMPLETED: { label: 'Tamamlandı', cls: 'badge-info' },
            CANCELLED: { label: 'İptal', cls: 'badge-error' },
            NO_SHOW: { label: 'Gelmedi', cls: 'badge-warning' },
        };
        return map[s] || { label: s, cls: 'badge-primary' };
    };

    const noteTypeLabel = (t: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            NOTE: { label: 'Not', cls: 'badge-info' },
            PRESCRIPTION: { label: 'Reçete', cls: 'badge-success' },
            DIAGNOSIS: { label: 'Tanı', cls: 'badge-warning' },
        };
        return map[t] || { label: t, cls: 'badge-primary' };
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={28} className="spin" style={{ color: 'var(--primary)' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '12px' }}>Hasta bilgileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="empty-state" style={{ padding: '80px 24px' }}>
                <User size={48} />
                <h3 style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>Hasta bulunamadı</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                    Bu ID'ye ait hasta kaydı bulunamadı veya silinmiş olabilir.
                </p>
                <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={() => router.push('/patients')}>
                    <ArrowLeft size={16} /> Hasta Listesine Dön
                </button>
            </div>
        );
    }

    const tabs: { id: TabId | 'messages'; label: string; icon: React.ElementType; count?: number; hidden?: boolean }[] = [
        { id: 'appointments', label: 'Randevular', icon: Calendar, count: patient._count?.appointments, hidden: isAccountant },
        { id: 'notes', label: 'Klinik Notları', icon: FileText, count: patient._count?.clinicalNotes, hidden: isAccountant },
        { id: 'messages', label: 'Mesajlar', icon: MessageSquare, hidden: isAccountant },
        { id: 'payments', label: 'Finansal Hareketler', icon: DollarSign, count: patient._count?.payments, hidden: isDoctor },
    ].filter(t => !t.hidden) as { id: TabId | 'messages'; label: string; icon: React.ElementType; count?: number; hidden?: boolean }[];

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast toast-${toast.type}`}>
                        {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                    </div>
                </div>
            )}

            {/* Back button */}
            <button
                className="btn btn-ghost"
                onClick={() => router.push('/patients')}
                style={{ marginBottom: '16px', padding: '6px 12px' }}
            >
                <ArrowLeft size={16} /> Hastalar
            </button>

            {/* Patient Header (Minimalist) */}
            <div style={{
                marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '16px', borderBottom: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary-muted)',
                        color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.125rem', fontWeight: 600, flexShrink: 0
                    }}>
                        {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {patient.firstName} {patient.lastName}
                        </h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px', alignItems: 'center' }}>
                            <a
                                href={`/messages?phone=${patient.phone}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', textDecoration: 'none' }}
                                title="WhatsApp Mesajları Aç"
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                                <Phone size={12}/> {formatPhone(patient.phone)}
                            </a>
                            {(patient as any).phone2 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: 'var(--border)' }}>|</span>
                                    <Phone size={12}/>
                                    <span>{formatPhone((patient as any).phone2)}</span>
                                    <span style={{
                                        fontSize: '0.65rem', background: 'var(--bg-hover)',
                                        color: 'var(--text-muted)', padding: '1px 5px',
                                        borderRadius: '4px', fontWeight: 500,
                                    }}>Veli/2. Tel</span>
                                </span>
                            )}
                            {patient.email && <span>• {patient.email}</span>}
                            {patient.dateOfBirth && <span>• Doğum: {format(new Date(patient.dateOfBirth), 'dd MMM yyyy', { locale: tr })}</span>}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {!isDoctor && balance && (
                        <div style={{ textAlign: 'right', marginRight: '8px' }}>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Bakiye</div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: balance.balance < 0 ? 'var(--error)' : 'var(--success)' }}>
                                ₺{balance.balance.toLocaleString('tr-TR')}
                            </div>
                        </div>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(true)}>
                        <Edit2 size={14} /> Düzenle
                    </button>
                    {patient.notes && (
                        <div title={`Genel Notlar: ${patient.notes}`} style={{ padding: '6px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', cursor: 'help' }}>
                            <Info size={16} style={{ color: 'var(--primary)' }} />
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                            onClick={() => {
                                if (tab.id === 'messages') {
                                    router.push(`/messages?phone=${patient.phone}`);
                                } else {
                                    setActiveTab(tab.id as TabId);
                                }
                            }}
                            style={{
                                padding: '10px 20px', fontSize: '0.9375rem', fontWeight: 500, color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Icon size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-3px' }} />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '10px' }}>{tab.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">
                {activeTab === 'appointments' && (
                    <div>
                        {(!patient.appointments || patient.appointments.length === 0) ? (
                            <div className="empty-state" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Calendar size={48} style={{ opacity: 0.2 }} />
                                <p style={{ marginTop: '12px' }}>Henüz randevu kaydı yok</p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-hover)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                        <tr>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Tarih</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Saat</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Doktor</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'right' }}>Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patient.appointments.map((apt: any) => {
                                            const st = statusLabel(apt.status);
                                            return (
                                                <tr key={apt.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '12px 20px', fontSize: '0.875rem' }}>
                                                        {format(new Date(apt.startTime), 'dd MMM yyyy', { locale: tr })}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500 }}>
                                                        {format(new Date(apt.startTime), 'HH:mm')}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', fontSize: '0.875rem' }}>
                                                        {apt.doctor ? `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}` : '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                                        <span className={`badge ${st.cls}`}>{st.label}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div>
                        {canvasLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                                <Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} />
                            </div>
                        ) : (
                            <PatientCanvas
                                patientId={patientId}
                                initialContent={canvasContent}
                                onSave={handleCanvasSave}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                            <a href="/finance" className="btn btn-secondary">
                                <DollarSign size={16} /> Tüm Finans Kayıtları
                            </a>
                        </div>
                        {(!patient.payments || patient.payments.length === 0) ? (
                            <div className="empty-state" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <CreditCard size={48} style={{ opacity: 0.2 }} />
                                <p style={{ marginTop: '12px' }}>Bu hastaya ait finansal kayıt bulunamadı</p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 0 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-hover)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                        <tr>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Tarih</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Tür</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Yöntem</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'right' }}>Tutar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patient.payments.map((p: any) => (
                                            <tr key={p.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '12px 20px', fontSize: '0.875rem' }}>
                                                    {format(new Date(p.paidAt), 'dd MMM yyyy', { locale: tr })}
                                                </td>
                                                <td style={{ padding: '12px 20px' }}>
                                                    <span className={`badge ${p.paymentType === 'PAYMENT' ? 'badge-success' : 'badge-error'}`}>
                                                        {p.paymentType === 'PAYMENT' ? 'Tahsilat' : 'İade'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 20px', fontSize: '0.875rem' }}>{p.paymentMethod}</td>
                                                <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600 }}>
                                                    ₺{p.amount.toLocaleString('tr-TR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <PatientModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleEditSuccess}
                patient={patient}
            />
        </div>
    );
}
