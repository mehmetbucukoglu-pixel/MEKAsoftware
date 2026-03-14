'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
    { keys: ['Ctrl', 'K'], label: 'Hızlı Arama' },
    { keys: ['Alt', 'N'], label: 'Yeni Hasta' },
    { keys: ['Alt', 'R'], label: 'Yeni Randevu' },
    { keys: ['Ctrl', '/'], label: 'Kısayolları Göster' },
];

export function useKeyboardShortcuts() {
    const router = useRouter();
    const [showCheatSheet, setShowCheatSheet] = useState(false);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't fire if user is typing in inputs UNLESS it's Ctrl+K which we want globally
            const tag = (e.target as HTMLElement)?.tagName;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;

            // Check for Ctrl/Cmd shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === '/') {
                    if (isTyping) return;
                    e.preventDefault();
                    setShowCheatSheet(prev => !prev);
                }
            }

            // Alt shortcuts (since Ctrl+N is locked by browsers)
            if (e.altKey && !isTyping) {
                if (e.key.toLowerCase() === 'n') {
                    e.preventDefault();
                    router.push('/patients?action=new');
                } else if (e.key.toLowerCase() === 'r') {
                    e.preventDefault();
                    router.push('/appointments?action=new');
                }
            }
        };
        // Use capture phase to intercept before browser defaults if possible
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, [router]);

    return { showCheatSheet, setShowCheatSheet };
}

export function ShortcutCheatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (!open) return null;

    return (
        <>
            <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}
                onClick={onClose}
            />
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '24px', minWidth: '320px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 9999,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Keyboard size={18} style={{ color: 'var(--primary)' }} />
                        Klavye Kısayolları
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {SHORTCUTS.map((s, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: i < SHORTCUTS.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{s.label}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {s.keys.map((key, j) => (
                                    <kbd key={j} style={{
                                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                        color: 'var(--text-secondary)', fontFamily: 'inherit',
                                    }}>
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
