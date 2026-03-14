'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveRestore, ArrowLeft, Loader2, Search, User } from 'lucide-react';
import { patientApi, Patient } from '@/lib/api';
import { maskTC, formatPhone } from '@/lib/format';
import { useAuthStore } from '@/lib/auth-store';

export default function DeletedPatientsPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role !== 'ADMIN') {
            router.push('/patients');
            return;
        }

        loadDeleted();
    }, [user, router]);

    const loadDeleted = async () => {
        setIsLoading(true);
        try {
            const { data } = await patientApi.listDeleted();
            setPatients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Silinmiş hastalar çekilemedi:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        if (!confirm('Bu hastayı geri almak istediğinize emin misiniz?')) return;

        setActionLoading(id);
        try {
            await patientApi.restore(id);
            setPatients(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Geri alma başarısız:", error);
            alert("Hasta geri alınırken bir hata oluştu.");
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = patients.filter(p => {
        const tr = search.toLowerCase();
        return (
            p.firstName.toLowerCase().includes(tr) ||
            p.lastName.toLowerCase().includes(tr) ||
            (p.tcKimlik && p.tcKimlik.includes(search)) ||
            (p.phone && p.phone.includes(search))
        );
    });

    if (user?.role !== 'ADMIN') return null;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button
                    onClick={() => router.push('/patients')}
                    className="btn-icon"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ArchiveRestore size={24} style={{ color: 'var(--warning)' }} />
                        Silinen Hastalar (Çöp Kutusu)
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9375rem' }}>
                        Sadece adminlerin erişebildiği pasif hastalar. Bu alandan hastaları aktif edebilirsiniz.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            className="input"
                            placeholder="Silinenlerde ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '42px' }}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Loader2 size={32} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
                        <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <ArchiveRestore size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                        <h3>Kayıt Bulunamadı</h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            {search ? 'Aramanıza uygun silinmiş hasta yok.' : 'Çöp kutusu boş.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Ad Soyad</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>TC Kimlik</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Telefon</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>Silinme Tarihi</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background var(--transition-fast)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <User size={18} style={{ color: 'var(--text-muted)' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{p.firstName} {p.lastName}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                            {maskTC(p.tcKimlik)}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            {formatPhone(p.phone)}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleRestore(p.id)}
                                                disabled={actionLoading === p.id}
                                                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
                                            >
                                                {actionLoading === p.id ? (
                                                    <Loader2 size={16} className="spin" />
                                                ) : (
                                                    <><ArchiveRestore size={16} /> Geri Al</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
