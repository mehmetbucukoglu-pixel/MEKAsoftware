'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Calendar, Users, TrendingUp, Clock, Loader2, DollarSign, Settings2, X, UserX, Timer, LayoutDashboard, UserPlus, PieChart, MessageSquare, ExternalLink, CheckCircle2, AlertCircle, Activity, Phone } from 'lucide-react';
import { dashboardApi, DashboardData, ExtendedKpis, Appointment, statisticsApi } from '@/lib/api';
import { PageHeader } from '@/lib/page-header';
import { getSocket } from '@/lib/socket';

const KPI_SELECTION_KEY = 'dashboard_kpi_selection';

interface KpiDefinition {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    getValue: (data: DashboardData | null, extra?: any) => string;
    hideForAccountant?: boolean;
}

const ALL_KPIS: KpiDefinition[] = [
    {
        id: 'appointmentsToday',
        label: 'Bugünkü Randevular',
        icon: Calendar,
        color: 'var(--primary)',
        bg: 'var(--primary-muted)',
        getValue: (d) => d?.stats?.appointmentsToday?.toString() || '0',
        hideForAccountant: true,
    },
    {
        id: 'totalPatients',
        label: 'Toplam Hasta',
        icon: Users,
        color: 'var(--success)',
        bg: 'rgba(16,185,129,0.15)',
        getValue: (d) => d?.stats?.totalPatients?.toString() || '0',
    },
    {
        id: 'occupancyRate',
        label: 'Doluluk Oranı',
        icon: PieChart,
        color: '#ec4899',
        bg: 'rgba(236,72,153,0.12)',
        getValue: (_d, extra) => `%${extra?.extKpis?.occupancyRate ?? 0}`,
    },
    {
        id: 'noShowRate',
        label: 'Gelmeme Oranı',
        icon: UserX,
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.12)',
        getValue: (_d, extra) => extra?.noShowRate != null ? `%${extra.noShowRate}` : '%0',
        hideForAccountant: true,
    },
    {
        id: 'unreadMessages',
        label: 'Okunmamış Mesaj',
        icon: MessageSquare,
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.12)',
        getValue: (_d, extra) => extra?.extKpis?.unreadMessages?.toString() || '0',
    },
    {
        id: 'weeklyAppointments',
        label: 'Haftalık Randevu Sayısı',
        icon: TrendingUp,
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.12)',
        getValue: (_d, extra) => extra?.extKpis?.weeklyAppointments?.toString() || '0',
    },
    {
        id: 'monthlyAppointments',
        label: 'Aylık Randevu Sayısı',
        icon: Calendar,
        color: '#06b6d4',
        bg: 'rgba(6,182,212,0.12)',
        getValue: (_d, extra) => extra?.extKpis?.monthlyAppointments?.toString() || '0',
    },
    {
        id: 'createdToday',
        label: 'Bugün Oluşturulan Randevu',
        icon: UserPlus,
        color: '#f97316',
        bg: 'rgba(249,115,22,0.12)',
        getValue: (_d, extra) => extra?.extKpis?.createdToday?.toString() || '0',
    },
    {
        id: 'appointmentChangesToday',
        label: 'Randevu Düzenlemeleri',
        icon: Settings2,
        color: '#eab308',
        bg: 'rgba(234,179,8,0.12)',
        getValue: (_d, extra) => extra?.extKpis?.appointmentChangesToday?.toString() || '0',
    },
];

const DEFAULT_SELECTED = ['appointmentsToday', 'totalPatients', 'occupancyRate', 'unreadMessages'];

export default function DashboardPage() {
    const { user, clinic } = useAuthStore();
    const isAccountant = user?.role === 'ACCOUNTANT';

    const [data, setData] = useState<DashboardData | null>(null);
    const [extraStats, setExtraStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [editingKpis, setEditingKpis] = useState(false);
    const [reminders, setReminders] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [escalations, setEscalations] = useState<any[]>([]);

    const [selectedKpis, setSelectedKpis] = useState<string[]>(DEFAULT_SELECTED);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(KPI_SELECTION_KEY);
        if (saved) {
            try {
                setSelectedKpis(JSON.parse(saved));
            } catch { }
        }
    }, []);

    const saveKpiSelection = (ids: string[]) => {
        setSelectedKpis(ids);
        localStorage.setItem(KPI_SELECTION_KEY, JSON.stringify(ids));
    };

    const toggleKpi = (id: string) => {
        const next = selectedKpis.includes(id)
            ? selectedKpis.filter(k => k !== id)
            : [...selectedKpis, id];
        if (next.length > 0 && next.length <= 4) saveKpiSelection(next);
    };



    const fetchDashboardData = useCallback(async () => {
        if (!clinic) return;
        setIsLoading(true);
        try {
            const [dashRes] = await Promise.all([
                dashboardApi.get(),
            ]);
            setData(dashRes.data);

            // Secondary fetches — non-blocking
            try {
                const [statsRes, extKpisRes, remindersRes, activityRes, escalationsRes] = await Promise.all([
                    statisticsApi.getOverview({}),
                    dashboardApi.getExtendedKpis(),
                    dashboardApi.getReminders(),
                    dashboardApi.getActivity(),
                    dashboardApi.getEscalations(),
                ]);
                setExtraStats({
                    noShowRate: statsRes.data.noShowRate,
                    avgDuration: statsRes.data.avgSessionMinutes,
                    extKpis: extKpisRes.data,
                });
                setReminders(remindersRes.data || []);
                setActivity(activityRes.data || []);
                setEscalations(escalationsRes.data || []);
            } catch { }
        } catch (error) {
            console.error('Dashboard verileri çekilemedi:', error);
        } finally {
            setIsLoading(false);
        }
    }, [clinic]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // WebSocket refresh listener
    useEffect(() => {
        if (!clinic || !user) return;
        const socket = getSocket(clinic.id, user.id, user.role);

        const handleUpdate = () => {
            console.log('Real-time update received, refreshing dashboard...');
            fetchDashboardData();
        };

        socket.on('conversation_updated', handleUpdate);
        socket.on('conversation_escalated', handleUpdate);
        socket.on('appointment_created', handleUpdate);

        return () => {
            socket.off('conversation_updated', handleUpdate);
            socket.off('conversation_escalated', handleUpdate);
            socket.off('appointment_created', handleUpdate);
        };
    }, [clinic, user, fetchDashboardData]);

    const availableKpis = ALL_KPIS.filter(k => !(isAccountant && k.hideForAccountant));
    const visibleKpis = availableKpis.filter(k => selectedKpis.includes(k.id));

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <Loader2 className="spin" size={32} style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    return (
        <div>
            {/* Header via Portal */}
            <PageHeader
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LayoutDashboard size={18} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Anasayfa</h1>
                    </div>
                }
            />

            {/* Local Greeting + KPI Edit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                        Merhaba, {user?.firstName}! 👋
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginTop: '6px', margin: 0, fontWeight: 500 }}>
                        {mounted ? new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </p>
                </div>
                <button
                    onClick={() => setEditingKpis(!editingKpis)}
                    title="KPI kartlarını düzenle"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: editingKpis ? 'var(--primary-muted)' : 'transparent',
                        border: 'none', cursor: 'pointer', padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        color: editingKpis ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '0.75rem', fontWeight: 500,
                        transition: 'all 0.15s', marginTop: '4px',
                    }}
                    onMouseEnter={(e) => { if (!editingKpis) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={(e) => { if (!editingKpis) e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                    {editingKpis ? <X size={14} /> : <Settings2 size={14} />}
                    {editingKpis ? 'Kapat' : 'Düzenle'}
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ marginBottom: '28px' }} data-onboarding="kpi-cards">

                {/* Edit mode: show all available KPIs as toggleable chips */}
                {editingKpis && (
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: '8px',
                        marginBottom: '16px', padding: '14px',
                        background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                    }}>
                        {availableKpis.map((kpi) => {
                            const isSelected = selectedKpis.includes(kpi.id);
                            const Icon = kpi.icon;
                            return (
                                <button
                                    key={kpi.id}
                                    onClick={() => toggleKpi(kpi.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                        background: isSelected ? 'var(--primary-muted)' : 'var(--bg-base)',
                                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <Icon size={14} />
                                    {kpi.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* KPI grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(visibleKpis.length, 4)}, 1fr)`,
                    gap: '16px',
                }}>
                    {visibleKpis.map((kpi) => {
                        const Icon = kpi.icon;
                        return (
                            <div key={kpi.id} className="card" style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                            }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                                    background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Icon size={22} style={{ color: kpi.color }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{kpi.getValue(data, extraStats)}</div>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{kpi.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

                {/* Accountant Specific View */}
                {isAccountant && (
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <DollarSign size={20} style={{ color: 'var(--warning)' }} />
                                Finansal Genel Bakış
                            </h3>
                            <a href="/reports" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                                Raporları Aç
                            </a>
                        </div>
                        <div style={{
                            height: '180px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-lg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <TrendingUp size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <p>Gelir Grafiği (Çok Yakında)</p>
                            </div>
                        </div>
                    </div>
                )}



                {/* Bugünkü Teyit Durumu */}
                {!isAccountant && (
                    <div className="card" style={{ minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                                Bugünkü Teyit Durumu
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {reminders.length} randevu
                            </span>
                        </div>
                        {reminders.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Bugün randevu yok.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                                {reminders.map((r: any) => {
                                    const rs = r.reminderStatus;
                                    const badge =
                                        rs === 'CONFIRMED' ? { text: 'Onaylandı', cls: 'badge-success' } :
                                        rs === 'SENT' ? { text: 'Gönderildi', cls: 'badge-info' } :
                                        rs === 'CANCELLED' ? { text: 'İptal', cls: 'badge-error' } :
                                        { text: 'Bekliyor', cls: 'badge-warning' };
                                    return (
                                        <div key={r.appointmentId} style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '8px 10px', borderRadius: 'var(--radius-md)',
                                        }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', width: '42px', flexShrink: 0 }}>
                                                {new Date(r.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {r.patientName}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dr. {r.doctorName}</div>
                                            </div>
                                            <span className={`badge ${badge.cls}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                                                {badge.text}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Bugünkü Hareketler */}
                {!isAccountant && (
                    <div className="card" style={{ minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={18} style={{ color: '#8b5cf6' }} />
                                Bugünkü Hareketler
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {activity.length} işlem
                            </span>
                        </div>
                        {activity.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Bugün hareket yok.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                                {activity.map((a: any, i: number) => {
                                    const actionStyle =
                                        a.action === 'CREATED'   ? { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: '+ Yeni' } :
                                        a.action === 'CANCELLED' ? { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: '✕ İptal' } :
                                        a.action === 'DELETED'   ? { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: '🗑 Silindi' } :
                                        { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '↻ Güncellendi' };
                                    const isWA = a.source === 'WHATSAPP';
                                    const canLink = isWA && a.patientPhone;
                                    const Wrapper = canLink ? 'a' : 'div';
                                    const wrapperProps = canLink
                                        ? { href: `/messages?phone=${a.patientPhone}`, style: { textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer' } as React.CSSProperties }
                                        : { style: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', borderRadius: 'var(--radius-md)' } as React.CSSProperties };
                                    return (
                                        <Wrapper key={i} {...wrapperProps}
                                            onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                            onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                                                borderRadius: '999px', background: actionStyle.bg, color: actionStyle.color,
                                                flexShrink: 0, marginTop: '2px',
                                            }}>
                                                {actionStyle.label}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{a.patientName}</div>
                                                {a.startTime && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {a.action === 'UPDATED'
                                                            ? `Yeni tarih: ${new Date(a.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${new Date(a.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                                                            : `${new Date(a.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${new Date(a.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {new Date(a.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {/* Source badge — Bot veya Manuel */}
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    color: isWA ? '#25d366' : '#94a3b8',
                                                    background: isWA ? 'rgba(37,211,102,0.1)' : 'rgba(148,163,184,0.1)',
                                                    padding: '1px 6px', borderRadius: '4px', fontWeight: 700
                                                }}>
                                                    {isWA ? 'Bot' : 'Manuel'}
                                                </span>
                                            </div>
                                        </Wrapper>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Bekleyen Mesajlar — full width */}
                {!isAccountant && (
                    <div className="card" style={{ borderLeft: '3px solid var(--error)', minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                                <AlertCircle size={18} />
                                Bekleyen Mesajlar
                                <span style={{
                                    background: 'var(--error)', color: '#fff',
                                    fontSize: '0.65rem', fontWeight: 700,
                                    padding: '1px 6px', borderRadius: '999px',
                                }}>
                                    {escalations.length}
                                </span>
                            </h3>
                            <a href="/messages" style={{ fontSize: '0.8125rem', color: escalations.length > 0 ? 'var(--error)' : 'var(--primary)', textDecoration: 'none' }}>
                                Mesajlara Git →
                            </a>
                        </div>
                        {escalations.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                ✅ Bekleyen mesaj yok.
                            </div>
                        ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                            {escalations.slice(0, 8).map((esc: any) => (
                                <a
                                    key={esc.conversationId}
                                    href={`/messages?phone=${esc.waPhone}`}
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--error-muted)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                                        {esc.patientName?.substring(0, 2)?.toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {esc.patientName}
                                            {esc.escalationReason && (
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                                    — {esc.escalationReason}
                                                </span>
                                            )}
                                        </div>
                                        {esc.lastMessageHint && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {esc.lastMessageHint}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, color: 'var(--text-muted)' }}>
                                        <Phone size={12} />
                                        <span style={{ fontSize: '0.7rem' }}>Görüşme</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

