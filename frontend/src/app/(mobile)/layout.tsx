'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

const NAV = [
    { href: '/mobile/calendar', icon: '📅', label: 'Takvim' },
    { href: '/mobile/messages', icon: '💬', label: 'Mesajlar' },
    { href: '/mobile/notifications', icon: '🔔', label: 'Ayarlar' },
];

export default function MobileLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, isLoading, loadUser } = useAuthStore();

    // Load user from token on mount (critical for page refresh)
    useEffect(() => { loadUser(); }, [loadUser]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div style={{ height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{
            height: '100svh',
            display: 'flex',
            flexDirection: 'column',
            background: '#0a0e1a',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            color: '#e2e8f0',
            overscrollBehavior: 'none',
            WebkitTapHighlightColor: 'transparent',
        }}>
            <Toaster
                position="top-center"
                toastOptions={{
                    style: { background: '#1e2a3a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
                    duration: 2500,
                }}
            />
            {/* Main content */}
            <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav style={{
                display: 'flex',
                background: 'rgba(15,20,40,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                zIndex: 100,
            }}>
                {NAV.map(item => {
                    const active = pathname === item.href || pathname.startsWith(item.href);
                    return (
                        <button
                            key={item.href}
                            onClick={() => { router.push(item.href); navigator.vibrate?.(10); }}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                padding: '10px 4px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: active ? '#818cf8' : 'rgba(148,163,184,0.7)',
                                transition: 'color 0.2s ease, transform 0.15s ease',
                                transform: active ? 'scale(1.05)' : 'scale(1)',
                            }}
                        >
                            <span style={{ fontSize: active ? 22 : 20, transition: 'font-size 0.2s ease' }}>{item.icon}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: active ? 700 : 500, letterSpacing: '0.02em' }}>{item.label}</span>
                            {active && (
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#818cf8', marginTop: 2 }} />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
