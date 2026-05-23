'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, User } from 'lucide-react';
import { patientApi, Patient } from '@/lib/api';
import { Highlight } from './highlight';
import { formatPhone } from '@/lib/format';

export function QuickSearch({ hideButton = false }: { hideButton?: boolean } = {}) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showTip, setShowTip] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Kısayol dinleyici (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setSearch('');
            setPatients([]);
        }
    }, [isOpen]);

    // Popup tip gösterimi
    useEffect(() => {
        const hasSeenTip = localStorage.getItem('klinikapp_seen_search_tip');
        if (!hasSeenTip) {
            setShowTip(true);
            setTimeout(() => {
                setShowTip(false);
                localStorage.setItem('klinikapp_seen_search_tip', 'true');
            }, 5000);
        }
    }, []);

    // Arama debounce
    useEffect(() => {
        if (!search || search.length < 2) {
            setPatients([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const res = await patientApi.list({ search, limit: 5 });
                setPatients(res.data.data);
            } catch (error) {
                console.error("Hızlı arama hatası:", error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const handleSelect = (patientId: string) => {
        setIsOpen(false);
        router.push(`/patients/${patientId}`);
    };

    return (
        <>
            {/* Header Button & Tip */}
            {!hideButton && (
                <div style={{ position: 'relative' }}>
                    <button
                        className="btn-icon"
                        onClick={() => setIsOpen(true)}
                        style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            color: 'var(--text-secondary)', padding: '6px 12px',
                            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '0.8125rem', cursor: 'pointer'
                        }}
                    >
                        <Search size={16} />
                        <span>Hızlı Arama</span>
                        <span style={{
                            background: 'var(--bg-base)', padding: '2px 6px',
                            borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600,
                            border: '1px solid var(--border)'
                        }}>Ctrl K</span>
                    </button>

                    {showTip && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                            background: 'var(--primary)', color: 'white', padding: '8px 12px',
                            borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', width: '220px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            <div style={{
                                position: 'absolute', top: '-4px', right: '30px',
                                width: '8px', height: '8px', background: 'var(--primary)',
                                transform: 'rotate(45deg)'
                            }} />
                            💡 <strong>İpucu:</strong> Ctrl+K kısayolu ile herhangi bir ekrandayken hızlıca hasta arayabilirsiniz.
                        </div>
                    )}
                </div>
            )}

            {/* Modal Overlay */}
            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: '10vh'
                }} onClick={() => setIsOpen(false)}>

                    <div style={{
                        width: '100%', maxWidth: '560px', background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        border: '1px solid var(--border)', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Search Input */}
                        <div style={{
                            display: 'flex', alignItems: 'center', padding: '16px',
                            borderBottom: '1px solid var(--border)'
                        }}>
                            <Search size={20} style={{ color: 'var(--text-muted)', marginRight: '12px' }} />
                            <input
                                ref={inputRef}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Hasta ara (Ad, Soyad, 11 Haneli TC, Telefon)..."
                                style={{
                                    flex: 1, background: 'transparent', border: 'none',
                                    color: 'var(--text-primary)', fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                            {isLoading ? (
                                <Loader2 size={18} className="spin" style={{ color: 'var(--primary)' }} />
                            ) : (
                                <button onClick={() => setIsOpen(false)} style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                    cursor: 'pointer', padding: '4px', display: 'flex'
                                }}>
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Search Results */}
                        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px 0' }}>
                            {search.length > 0 && search.length < 2 && (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    Aramaya başlamak için en az 2 karakter girin.
                                </div>
                            )}

                            {search.length >= 2 && !isLoading && patients.length === 0 && (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    Sonuç bulunamadı: "{search}"
                                </div>
                            )}

                            {search.length > 0 && !isNaN(Number(search)) && search.length < 11 && (
                                <div style={{ padding: '8px 16px', fontSize: '0.75rem', color: 'var(--warning)', background: 'var(--warning-muted)', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                    💡 Güvenlik gereği TC Kimlik araması için numaranın <strong>tamamını (11 hane)</strong> girmelisiniz.
                                </div>
                            )}

                            {patients.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelect(p.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', padding: '12px 16px',
                                        cursor: 'pointer', transition: 'background var(--transition-fast)',
                                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
                                        background: 'var(--primary-muted)', color: 'var(--primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, marginRight: '12px'
                                    }}>
                                        <User size={18} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                                            <Highlight text={`${p.firstName} ${p.lastName}`} query={search} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            <span style={{ fontFamily: 'monospace' }}>
                                                Telefon: <Highlight text={formatPhone(p.phone)} query={search} />
                                            </span>
                                            <span>
                                                Tel: <Highlight text={formatPhone(p.phone)} query={search} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '8px 16px', background: 'var(--bg-base)',
                            borderTop: '1px solid var(--border)', fontSize: '0.75rem',
                            color: 'var(--text-muted)', display: 'flex', justifyContent: 'center'
                        }}>
                            Kapatmak için ESC tuşuna veya dışarıya tıklayın
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
