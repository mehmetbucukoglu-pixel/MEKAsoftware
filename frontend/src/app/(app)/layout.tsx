'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { notificationApi } from '@/lib/api';
import {
    LayoutDashboard, Calendar, MessageSquare, Users,
    Bell, Settings, LogOut, ChevronRight, ListTodo, CheckCircle2,
    PieChart, PanelLeftClose, PanelLeft, ChevronUp, Building2, Keyboard
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useHeaderStore } from '@/lib/header-store';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import dynamic from 'next/dynamic';
import { useKeyboardShortcuts } from '@/components/keyboard-shortcuts';

const OnboardingTooltips = dynamic(
    () => import('@/components/onboarding-tooltips').then((mod) => mod.OnboardingTooltips),
    { ssr: false }
);

const ShortcutCheatSheet = dynamic(
    () => import('@/components/keyboard-shortcuts').then((mod) => mod.ShortcutCheatSheet),
    { ssr: false }
);

const QuickSearch = dynamic(
    () => import('@/components/quick-search').then((mod) => mod.QuickSearch),
    { ssr: false }
);

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Ana Sayfa' },
    { href: '/appointments', icon: Calendar, label: 'Takvim' },
    { href: '/tasks', icon: ListTodo, label: 'Workspace' },
    { href: '/patients', icon: Users, label: 'Hastalar' },
    { href: '/messages', icon: MessageSquare, label: 'Mesajlar' },
    { href: '/reports', icon: PieChart, label: 'Raporlar' },
];

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, clinic, isLoading, isAuthenticated, loadUser, logout } = useAuthStore();
    const headerTitle = useHeaderStore(s => s.title);
    const headerActions = useHeaderStore(s => s.actions);
    const { showCheatSheet, setShowCheatSheet } = useKeyboardShortcuts();

    // Sidebar collapse
    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved === 'true') setCollapsed(true);
    }, []);
    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    };

    // Profile dropdown
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    interface AppNotification {
        id: string;
        title: string;
        body: string;
        isRead: boolean;
        createdAt: string;
        entityType?: string;
        entityId?: string;
    }

    // Notifications State
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Fetch Notifications Logic
    const fetchNotifications = async () => {
        try {
            const { data } = await notificationApi.list();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfile(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationApi.markRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllRead();
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (isLoading) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-base)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const sidebarWidth = collapsed ? '64px' : 'var(--sidebar-width)';

    // Find current page label (also check /reports for finance/statistics redirects)
    const allRoutes = [
        ...navItems,
        { href: '/finance', label: 'Raporlar' },
        { href: '/statistics', label: 'Raporlar' },
        { href: '/settings', label: 'Ayarlar' },
    ];
    const currentPageLabel = allRoutes.find(n => pathname?.startsWith(n.href))?.label || 'Sayfa';

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* ======= SIDEBAR ======= */}
            <aside style={{
                width: sidebarWidth,
                minWidth: sidebarWidth,
                height: '100vh',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s ease, min-width 0.2s ease',
                overflow: 'hidden',
            }}>
                {/* Logo */}
                <div style={{
                    padding: collapsed ? '8px' : '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    height: '64px',
                    minHeight: '64px',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <img
                        src="/logo.png"
                        alt="MEKA"
                        style={{
                            height: collapsed ? '24px' : 'auto',
                            width: collapsed ? '24px' : '70%',
                            maxWidth: '140px',
                            objectFit: 'contain',
                            transition: 'all 0.2s ease',
                        }}
                    />
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: collapsed ? '8px 6px' : '12px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={collapsed ? item.label : undefined}
                                    data-onboarding={item.label === 'Workspace' ? 'workspace-link' : item.label === 'Hastalar' ? 'patients-link' : undefined}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: collapsed ? '10px' : '10px 12px',
                                        borderRadius: 'var(--radius-md)',
                                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                        background: isActive ? 'var(--primary-muted)' : 'transparent',
                                        textDecoration: 'none', fontSize: '0.875rem', fontWeight: isActive ? 500 : 400,
                                        transition: 'all var(--transition-fast)',
                                        position: 'relative',
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'var(--bg-hover)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }
                                    }}
                                >
                                    {isActive && !collapsed && (
                                        <div style={{
                                            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                                            width: '3px', height: '20px', background: 'var(--primary)',
                                            borderRadius: '0 2px 2px 0',
                                        }} />
                                    )}
                                    <Icon size={18} />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Bottom section */}
                <div style={{ padding: collapsed ? '8px 6px' : '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                    {/* Collapse toggle */}
                    <button
                        onClick={toggleCollapsed}
                        title={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: collapsed ? '10px' : '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                            color: 'var(--text-muted)', background: 'transparent',
                            border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                            transition: 'all var(--transition-fast)',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            marginBottom: '8px',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                    >
                        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                        {!collapsed && <span>Daralt</span>}
                    </button>

                    {/* User info + Profile Dropdown */}
                    <div ref={profileRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowProfile(!showProfile)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: collapsed ? '10px' : '12px',
                                width: '100%',
                                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                transition: 'all var(--transition-fast)',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                        >
                            <div style={{
                                width: '34px', height: '34px', borderRadius: 'var(--radius-full)',
                                background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8125rem', fontWeight: 600, color: '#fff', flexShrink: 0,
                            }}>
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            {!collapsed && (
                                <>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                                            {user?.firstName} {user?.lastName}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                            {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'DOCTOR' ? 'Doktor' : 'Asistan'}
                                        </div>
                                    </div>
                                    <ChevronUp size={14} style={{
                                        color: 'var(--text-muted)', flexShrink: 0,
                                        transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                    }} />
                                </>
                            )}
                        </button>

                        {/* Profile Dropdown */}
                        {showProfile && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0, right: collapsed ? 'auto' : 0,
                                marginBottom: '6px',
                                minWidth: collapsed ? '200px' : undefined,
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-lg)',
                                zIndex: 50,
                                overflow: 'hidden',
                            }}>
                                {/* Clinic name */}
                                <div style={{
                                    padding: '12px 14px',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Building2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {clinic?.name || 'Klinik'}
                                        </span>
                                    </div>
                                </div>
                                {/* Ayarlar */}
                                <Link
                                    href="/settings"
                                    onClick={() => setShowProfile(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 14px',
                                        color: 'var(--text-secondary)', textDecoration: 'none',
                                        fontSize: '0.8125rem',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <Settings size={15} /> Ayarlar
                                </Link>
                                {/* Çıkış */}
                                <button
                                    onClick={() => { setShowProfile(false); handleLogout(); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 14px', width: '100%',
                                        color: 'var(--error)', background: 'transparent',
                                        border: 'none', cursor: 'pointer', fontSize: '0.8125rem',
                                        borderTop: '1px solid var(--border)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <LogOut size={15} /> Çıkış Yap
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* ======= MAIN CONTENT ======= */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'var(--bg-base)',
            }}>
                {/* Top header — Global tools + Page Title */}
                <header style={{
                    height: '64px', minHeight: '64px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                        {headerTitle || (
                            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                {currentPageLabel}
                            </span>
                        )}
                        {headerActions && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '16px' }}>
                                {headerActions}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} data-onboarding="shortcuts-toggle">
                        <button
                            className="btn-icon"
                            onClick={() => setShowCheatSheet(true)}
                            title="Klavye Kısayolları (Ctrl+/)"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 12px',
                                borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 500,
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                            <Keyboard size={16} />
                            <span>Kısayollar</span>
                            <kbd style={{
                                padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem',
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                color: 'var(--text-muted)', marginLeft: '4px',
                            }}>
                                Ctrl+/
                            </kbd>
                        </button>
                        <div style={{ position: 'relative' }} ref={notifRef}>
                            <button
                                className="btn-icon"
                                onClick={() => setShowNotifications(!showNotifications)}
                                style={{
                                    position: 'relative', background: 'transparent', border: 'none',
                                    color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px',
                                    borderRadius: 'var(--radius-md)',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notification-dot" />}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    width: '320px',
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 50,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Bildirimler {unreadCount > 0 && `(${unreadCount})`}</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllAsRead}
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                                            >
                                                Tümünü Okundu İşaretle
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                Bildiriminiz bulunmuyor.
                                            </div>
                                        ) : (
                                            notifications.map((notif: AppNotification) => (
                                                <div
                                                    key={notif.id}
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid var(--border)',
                                                        backgroundColor: notif.isRead ? 'transparent' : 'var(--primary-muted)',
                                                        display: 'flex',
                                                        gap: '12px',
                                                        alignItems: 'flex-start'
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                            {notif.title}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            {notif.body}
                                                        </div>
                                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                                            {new Date(notif.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    {!notif.isRead && (
                                                        <button
                                                            onClick={async () => {
                                                                await handleMarkAsRead(notif.id);
                                                                if (notif.entityType === 'task') {
                                                                    router.push('/tasks');
                                                                    setShowNotifications(false);
                                                                }
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}
                                                            title="Okundu olarak işaretle"
                                                        >
                                                            <CheckCircle2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div style={{ padding: '8px', borderTop: '1px solid var(--border)', textAlign: 'center', backgroundColor: 'var(--bg-base)' }}>
                                        <button
                                            onClick={() => { setShowNotifications(false); }}
                                            style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                        >
                                            Kapat
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <div style={{
                    flex: 1,
                    overflow: (pathname === '/tasks' || pathname === '/appointments') ? 'hidden' : 'auto',
                    padding: (pathname === '/tasks' || pathname === '/appointments') ? '0' : '24px'
                }}>
                    <QueryClientProvider client={queryClient}>
                        <div className="animate-fadeIn" style={{ height: (pathname === '/tasks' || pathname === '/appointments') ? '100%' : 'auto' }}>
                            <Toaster position="top-right" />
                            {children}
                        </div>
                        <ReactQueryDevtools initialIsOpen={false} />
                    </QueryClientProvider>
                </div>
            </main>
            <OnboardingTooltips />
            <ShortcutCheatSheet open={showCheatSheet} onClose={() => setShowCheatSheet(false)} />
            <QuickSearch hideButton />
        </div>
    );
}
