'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { subscribeToPush, unsubscribeFromPush, getPushStatus } from '@/lib/push-client';
import toast from 'react-hot-toast';

type Prefs = {
    escalatedMessages: boolean;
    appointmentCreated: boolean;
    appointmentCancelled: boolean;
    appointmentUpdated: boolean;
};

const PREF_LABELS: { key: keyof Prefs; label: string; desc: string }[] = [
    { key: 'escalatedMessages', label: '🔴 Eskale edilen mesajlar', desc: 'WhatsApp botu devredemeyince' },
    { key: 'appointmentCreated', label: '✅ Yeni randevu', desc: 'Randevu oluşturulunca' },
    { key: 'appointmentCancelled', label: '❌ Randevu iptali', desc: 'Randevu iptal edilince' },
    { key: 'appointmentUpdated', label: '✏️ Randevu güncellendi', desc: 'Saat/tarih değişince' },
];

export default function MobileNotificationsPage() {
    const [prefs, setPrefs] = useState<Prefs>({
        escalatedMessages: true,
        appointmentCreated: true,
        appointmentCancelled: true,
        appointmentUpdated: false,
    });
    const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setPushStatus(await getPushStatus());
            try {
                const res = await api.get('/push/preferences');
                setPrefs(res.data);
            } catch { /* use defaults */ }
            finally { setIsLoading(false); }
        };
        load();
    }, []);

    const togglePref = async (key: keyof Prefs) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        navigator.vibrate?.(10);
        try {
            await api.patch('/push/preferences', updated);
        } catch { toast.error('Kaydedilemedi'); setPrefs(prefs); }
    };

    const handleEnablePush = async () => {
        setIsSaving(true);
        const ok = await subscribeToPush();
        if (ok) {
            toast.success('Bildirimler aktif! 🔔');
            setPushStatus('granted');
        } else if (Notification.permission === 'denied') {
            toast.error('Tarayıcı ayarlarından bildirim iznini açın');
            setPushStatus('denied');
        } else {
            toast.error('Bildirim etkinleştirilemedi');
        }
        setIsSaving(false);
    };

    const handleDisablePush = async () => {
        setIsSaving(true);
        await unsubscribeFromPush();
        setPushStatus('default');
        toast.success('Bildirimler devre dışı');
        setIsSaving(false);
    };

    return (
        <div style={{ padding: 16 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.125rem', fontWeight: 700 }}>🔔 Bildirim Ayarları</h2>

            {/* Push status */}
            <div style={{
                background: pushStatus === 'granted' ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
                border: `1px solid ${pushStatus === 'granted' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                borderRadius: 14, padding: 16, marginBottom: 24,
            }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {pushStatus === 'granted' ? '✅ Bildirimler Aktif' :
                     pushStatus === 'denied' ? '🚫 Bildirim İzni Reddedildi' :
                     pushStatus === 'unsupported' ? '⚠️ Desteklenmiyor' :
                     '📱 Telefon Bildirimleri'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: 12 }}>
                    {pushStatus === 'granted' ? 'Bu cihaz bildirim alıyor.' :
                     pushStatus === 'denied' ? 'Tarayıcı ayarlarından izin verin.' :
                     pushStatus === 'unsupported' ? 'Bu tarayıcı push bildirimleri desteklemiyor.' :
                     'Randevu ve eskale bildirimlerini telefonunuza alın.'}
                </div>
                {pushStatus !== 'unsupported' && pushStatus !== 'denied' && (
                    pushStatus === 'granted' ? (
                        <button onClick={handleDisablePush} disabled={isSaving} style={outlineBtn}>
                            Devre Dışı Bırak
                        </button>
                    ) : (
                        <button onClick={handleEnablePush} disabled={isSaving} style={primaryBtn}>
                            {isSaving ? 'Etkinleştiriliyor...' : '🔔 Bildirimleri Etkinleştir'}
                        </button>
                    )
                )}
            </div>

            {/* Preferences */}
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#94a3b8', fontSize: '0.8rem', letterSpacing: '0.06em' }}>
                HANGİ BİLDİRİMLER
            </div>
            {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
                ))
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PREF_LABELS.map(({ key, label, desc }) => (
                        <button
                            key={key}
                            onClick={() => togglePref(key)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                                textAlign: 'left', width: '100%', transition: 'background 0.15s ease',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{label}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{desc}</div>
                            </div>
                            {/* Toggle */}
                            <div style={{
                                width: 48, height: 28, borderRadius: 14, flexShrink: 0,
                                background: prefs[key] ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                position: 'relative', transition: 'background 0.2s ease',
                            }}>
                                <div style={{
                                    position: 'absolute', top: 3, left: prefs[key] ? 23 : 3,
                                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                                    transition: 'left 0.2s cubic-bezier(0.32,0.72,0,1)',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                }} />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Install prompt */}
            <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>📲 Ana Ekrana Ekle</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                    <strong>Android:</strong> Chrome menüsü → "Ana ekrana ekle"<br />
                    <strong>iOS (Safari 16.4+):</strong> Paylaş → "Ana Ekrana Ekle"
                </div>
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
        </div>
    );
}

const primaryBtn: React.CSSProperties = {
    padding: '11px 20px', borderRadius: 10, background: '#6366f1',
    border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
};
const outlineBtn: React.CSSProperties = {
    padding: '11px 20px', borderRadius: 10, background: 'transparent',
    border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
};
