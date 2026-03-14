'use client';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { PageHeader } from '@/lib/page-header';

export default function SettingsPage() {
    const { user, clinic } = useAuthStore();

    return (
        <div>
            {/* Header via Portal */}
            <PageHeader
                title={
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                            <SettingsIcon size={18} style={{ color: 'var(--primary)' }} />
                            Ayarlar
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '2px', margin: 0 }}>Klinik ayarları, personel yönetimi ve hesap tercihleri</p>
                    </div>
                }
            />

            <div style={{ display: 'grid', gap: '20px', maxWidth: '600px', marginTop: '24px' }}>
                {/* Clinic Info */}
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Klinik Bilgileri</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                            <span className="label">Klinik Adı</span>
                            <input className="input" value={clinic?.name || ''} readOnly />
                        </div>
                        <div>
                            <span className="label">Kısa Ad (Slug)</span>
                            <input className="input" value={clinic?.slug || ''} readOnly />
                        </div>
                    </div>
                </div>

                {/* User Info */}
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Hesap Bilgileri</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                            <span className="label">Ad Soyad</span>
                            <input className="input" value={`${user?.firstName || ''} ${user?.lastName || ''}`} readOnly />
                        </div>
                        <div>
                            <span className="label">E-posta</span>
                            <input className="input" value={user?.email || ''} readOnly />
                        </div>
                        <div>
                            <span className="label">Rol</span>
                            <input className="input" value={user?.role === 'ADMIN' ? 'Admin' : user?.role === 'DOCTOR' ? 'Doktor' : 'Asistan'} readOnly />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
