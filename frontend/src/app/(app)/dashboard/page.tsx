'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Calendar, Users, TrendingUp, Clock, Loader2, DollarSign, Settings2, X, UserX, Timer, LayoutDashboard, UserPlus, PieChart, MessageSquare, ExternalLink } from 'lucide-react';
import { getRecentPatients, RecentPatient } from '@/lib/recent-patients';
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
    const [recent, setRecent] = useState<RecentPatient[]>([]);
    const [editingKpis, setEditingKpis] = useState(false);

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

    useEffect(() => {
        setRecent(getRecentPatients());
    }, []);

    const fetchDashboardData = useCallback(async () => {
        if (!clinic) return;
        setIsLoading(true);
        try {
            const [dashRes] = await Promise.all([
                dashboardApi.get(),
            ]);
            setData(dashRes.data);

            // Fetch statistics + extended KPIs
            try {
                const [statsRes, extKpisRes] = await Promise.all([
                    statisticsApi.getOverview({}),
                    dashboardApi.getExtendedKpis(),
                ]);
                setExtraStats({
                    noShowRate: statsRes.data.noShowRate,
                    avgDuration: statsRes.data.avgSessionMinutes,
                    extKpis: extKpisRes.data,
                });
            } catch { }
        } catch (error) {
            console.error("Dashboard verileri çekilemedi:", error);
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

            {/* Content Grid — only Today's Appointments + Recent Patients */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>

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

                {/* Upcoming Appointments (Hidden for Accountant) */}
                {!isAccountant && (
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={18} style={{ color: 'var(--primary)' }} />
                                Bugünkü Randevular
                            </h3>
                            <a href="/appointments" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                Tümünü Gör →
                            </a>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {data?.dailySchedule?.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    Bugün için randevu bulunmuyor.
                                </div>
                            ) : (
                                data?.dailySchedule?.map((apt) => {
                                    const timeStr = new Date(apt.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                                    let displayStatus = apt.status;
                                    if (new Date(apt.endTime) < new Date() && displayStatus !== 'NO_SHOW' && displayStatus !== 'CANCELLED') {
                                        displayStatus = 'COMPLETED';
                                    }

                                    let statusText = 'Bekliyor';
                                    let statusClass = 'badge-info';

                                    if (displayStatus === 'COMPLETED') { statusText = 'Tamamlandı'; statusClass = 'badge-success'; }
                                    if (displayStatus === 'ARRIVED') { statusText = 'Geldi'; statusClass = 'badge-success'; }
                                    if (displayStatus === 'CANCELLED') { statusText = 'İptal'; statusClass = 'badge-error'; }
                                    if (displayStatus === 'NO_SHOW') { statusText = 'Gelmedi'; statusClass = 'badge-error'; }

                                    return (
                                        <div key={apt.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '10px 12px', borderRadius: 'var(--radius-md)',
                                            transition: 'background var(--transition-fast)',
                                            cursor: 'pointer',
                                        }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <div style={{
                                                fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)',
                                                width: '48px', flexShrink: 0,
                                            }}>
                                                {timeStr}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <a href={`/patients/${apt.patientId}`} style={{ color: 'inherit', textDecoration: 'none' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                                                    >
                                                        {apt.patient?.firstName} {apt.patient?.lastName}
                                                    </a>
                                                    {apt.patient?.registrationStatus === 'PRE_REGISTERED' && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            background: 'var(--warning-muted)',
                                                            color: 'var(--warning)',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            fontWeight: 600
                                                        }}>
                                                            Ön Kayıt
                                                        </span>
                                                    )}
                                                    {apt.patient?.conversations && (apt.patient.conversations[0] as any)?.unreadCount > 0 && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            background: 'rgba(34, 197, 94, 0.15)',
                                                            color: '#16a34a',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}>
                                                            <div style={{ width: '5px', height: '5px', background: '#16a34a', borderRadius: '50%' }} />
                                                            {apt.patient.conversations[0]?.unreadCount} Yeni Mesaj
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Dr. {apt.doctor?.firstName} {apt.doctor?.lastName}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {apt.patient?.phone && (
                                                    <a href={`/messages?phone=${apt.patient.phone}`} title="Mesajları Aç"
                                                        style={{ color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                    >
                                                        <MessageSquare size={14} />
                                                    </a>
                                                )}
                                                <span className={`badge ${statusClass}`}>{statusText}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Son Görüntülenen Hastalar (Hidden for Accountant) */}
                {!isAccountant && (
                    <div className="card">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Users size={18} style={{ color: 'var(--success)' }} />
                            Son Görüntülenenler
                        </h3>
                        {recent.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Henüz görüntülenen hasta yok.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {recent.map((r, i) => (
                                    <a
                                        key={i}
                                        href={`/patients/${r.id}`}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '10px 12px', borderRadius: 'var(--radius-md)',
                                            transition: 'background var(--transition-fast)',
                                            textDecoration: 'none', color: 'inherit'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'var(--success-muted)', color: 'var(--success)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {r.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                                            {r.name}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(r.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
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
