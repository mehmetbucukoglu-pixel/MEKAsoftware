'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Plus, ChevronLeft, ChevronRight, Loader2, ArchiveRestore } from 'lucide-react';
import { patientApi, Patient, PatientListResponse } from '@/lib/api';
import PatientModal from './patient-modal';
import { Highlight } from '@/components/highlight';
import { maskTC, formatPhone } from '@/lib/format';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/lib/page-header';

export default function PatientsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editPatient, setEditPatient] = useState<Patient | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const LIMIT = 15;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch patients
    const fetchPatients = useCallback(async () => {
        if (!debouncedSearch || debouncedSearch.length < 3) {
            setPatients([]);
            setTotal(0);
            setTotalPages(0);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await patientApi.list({
                search: debouncedSearch,
                page,
                limit: LIMIT,
            });
            setPatients(data.data);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch {
            setPatients([]);
            setTotal(0);
            setTotalPages(0);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, page]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    // Toast auto-dismiss
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleSuccess = () => {
        setToast({ type: 'success', message: editPatient ? 'Hasta güncellendi' : 'Hasta eklendi' });
        setEditPatient(null);
        fetchPatients();
    };

    const handleEdit = (e: React.MouseEvent, patient: Patient) => {
        e.stopPropagation();
        setEditPatient(patient);
        setModalOpen(true);
    };

    const handleRowClick = (patient: Patient) => {
        router.push(`/patients/${patient.id}`);
    };

    const genderLabel = (g?: string | null) => {
        if (g === 'MALE') return 'Erkek';
        if (g === 'FEMALE') return 'Kadın';
        if (g === 'OTHER') return 'Diğer';
        return '—';
    };

    const getLastVisit = (patient: Patient) => {
        if (patient.appointments && patient.appointments.length > 0) {
            return new Date(patient.appointments[0].startTime).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'short', year: 'numeric',
            });
        }
        return '—';
    };

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

            {/* Header via Portal */}
            <PageHeader
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Hastalar</h1>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginLeft: '8px', fontWeight: 400 }}>
                            {isLoading ? '...' : `${total} hasta`}
                        </span>
                    </div>
                }
            />

            {/* Search Controls */}
            <div className="card" style={{ marginBottom: '20px', padding: '12px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input"
                        placeholder="Hasta ara... (en az 3 karakter: isim, telefon, e-posta, TC Kimlik)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%', background: 'transparent', border: 'none' }}
                    />
                </div>
            </div>

            {/* Patient Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                        <div style={{ textAlign: 'center' }}>
                            <Loader2 size={28} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '12px' }}>Hastalar yükleniyor...</p>
                        </div>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px 24px' }}>
                        <Users size={48} />
                        <h3 style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
                            {(!debouncedSearch || debouncedSearch.length < 3)
                                ? 'Arama yapın'
                                : 'Hasta bulunamadı'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                            {(!debouncedSearch || debouncedSearch.length < 3)
                                ? 'Hastaları listelemek için yukarıdaki alana en az 3 karakter girin.'
                                : `"${debouncedSearch}" için sonuç yok. Farklı bir arama deneyin.`
                            }
                        </p>
                        {(!debouncedSearch || debouncedSearch.length < 3) && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => { setEditPatient(null); setModalOpen(true); }}
                                >
                                    <Plus size={16} /> Yeni Hasta
                                </button>
                                {user?.role === 'ADMIN' && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => router.push('/patients/deleted')}
                                        title="Silinen Hastalar (Çöp Kutusu)"
                                    >
                                        <ArchiveRestore size={16} /> Silinen Hastalar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ad Soyad</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>TC Kimlik</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Telefon</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Cinsiyet</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Son Ziyaret</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map((p) => (
                                    <tr
                                        key={p.id}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'background var(--transition-fast)',
                                        }}
                                        onClick={() => handleRowClick(p)}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
                                                    background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', flexShrink: 0,
                                                }}>
                                                    {p.firstName[0]}{p.lastName[0]}
                                                </div>
                                                <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Highlight text={`${p.firstName} ${p.lastName}`} query={search} />
                                                    {p.registrationStatus === 'PRE_REGISTERED' && (
                                                        <span style={{
                                                            fontSize: '0.6rem',
                                                            background: 'var(--warning-muted)',
                                                            color: 'var(--warning)',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            fontWeight: 600
                                                        }}>
                                                            Ön Kayıt
                                                        </span>
                                                    )}
                                                </span>

                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                            <Highlight text={maskTC(p.tcKimlik)} query={search} />
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            <Highlight text={formatPhone(p.phone)} query={search} />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {p.gender ? (
                                                <span className={`badge ${p.gender === 'MALE' ? 'badge-info' : p.gender === 'FEMALE' ? 'badge-primary' : 'badge-warning'}`}>
                                                    {genderLabel(p.gender)}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            {getLastVisit(p)}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={(e) => handleEdit(e, p)}
                                            >
                                                Düzenle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            className={`pagination-btn ${pageNum === page ? 'pagination-btn-active' : ''}`}
                                            onClick={() => setPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <span className="pagination-info">{total} hasta</span>

                                <button
                                    className="pagination-btn"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Patient Modal */}
            <PatientModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditPatient(null); }}
                onSuccess={handleSuccess}
                patient={editPatient}
            />
        </div>
    );
}
