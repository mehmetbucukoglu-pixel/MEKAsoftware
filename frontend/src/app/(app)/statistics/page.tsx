'use client';

import { useEffect, useState } from 'react';
import { statisticsApi, userApi, StatisticsOverview, VisitStats, Appointment } from '@/lib/api';
import {
    BarChart3, Users, Clock, UserX, TrendingUp, Activity,
    ArrowUpRight, ArrowDownRight, Calendar, Filter
} from 'lucide-react';
import { PageHeader } from '@/lib/page-header';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Colors
const CHART_COLORS = {
    primary: '#6366f1',
    primaryLight: 'rgba(99, 102, 241, 0.15)',
    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.15)',
    danger: '#ef4444',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    muted: '#64748b',
};

const HOURLY_GRADIENT = [
    '#1e1b4b', '#312e81', '#3730a3', '#4338ca', '#4f46e5',
    '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#818cf8',
    '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#4f46e5',
    '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#818cf8',
    '#6366f1', '#4f46e5', '#3730a3', '#1e1b4b',
];

export default function StatisticsPage() {
    const [overview, setOverview] = useState<StatisticsOverview | null>(null);
    const [visits, setVisits] = useState<VisitStats | null>(null);
    const [recentVisits, setRecentVisits] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
    const [loading, setLoading] = useState(true);

    const getDateParams = () => {
        const now = new Date();
        let startDate: Date;
        if (dateRange === 'week') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
        } else if (dateRange === 'quarter') {
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        return {
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            ...(selectedDoctor ? { doctorId: selectedDoctor } : {}),
        };
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = getDateParams();
            const [overviewRes, visitsRes, recentRes, doctorsRes] = await Promise.all([
                statisticsApi.getOverview(params),
                statisticsApi.getVisits(params),
                statisticsApi.getRecentVisits(15),
                userApi.getDoctors(),
            ]);
            setOverview(overviewRes.data);
            setVisits(visitsRes.data);
            setRecentVisits(recentRes.data);
            setDoctors(doctorsRes.data);
        } catch (err) {
            console.error('Failed to fetch statistics', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange, selectedDoctor]);

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} dk`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}s ${m}dk`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && !overview) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>İstatistikler yükleniyor...</p>
                </div>
            </div>
        );
    }

    const kpiCards = overview ? [
        {
            label: 'Toplam Giriş',
            value: overview.checkedIn,
            icon: Users,
            color: CHART_COLORS.primary,
            bgColor: CHART_COLORS.primaryLight,
            sub: `${overview.totalAppointments} randevu`,
        },
        {
            label: 'Ort. Seans Süresi',
            value: formatDuration(overview.avgSessionMinutes),
            icon: Clock,
            color: CHART_COLORS.success,
            bgColor: CHART_COLORS.successLight,
            sub: `${overview.completed} tamamlanan`,
        },
        {
            label: 'Gelmeme Oranı',
            value: `%${overview.noShowRate}`,
            icon: UserX,
            color: overview.noShowRate > 15 ? CHART_COLORS.danger : CHART_COLORS.warning,
            bgColor: overview.noShowRate > 15 ? CHART_COLORS.dangerLight : CHART_COLORS.warningLight,
            sub: `${overview.noShow} gelmedi`,
        },
        {
            label: 'Aktif Hasta',
            value: overview.uniquePatients,
            icon: Activity,
            color: CHART_COLORS.success,
            bgColor: CHART_COLORS.successLight,
            sub: 'benzersiz hasta',
        },
    ] : [];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Local Page Title */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart3 size={22} style={{ color: 'var(--primary)' }} />
                    İstatistikler
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
                    Hasta giriş/çıkış takibi ve klinik performans verileri
                </p>
            </div>

            {/* Local Page Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Doctor Filter */}
                    <div style={{ position: 'relative' }}>
                        <Filter size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <select
                            value={selectedDoctor}
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                            style={{
                                padding: '8px 12px 8px 30px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                outline: 'none',
                                height: '42px'
                            }}
                        >
                            <option value="">Tüm Doktorlar</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div style={{
                        display: 'flex', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', overflow: 'hidden',
                        height: '42px', background: 'var(--bg-elevated)'
                    }}>
                        {(['week', 'month', 'quarter'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                style={{
                                    padding: '0 16px',
                                    border: 'none',
                                    background: dateRange === range ? 'var(--primary-muted)' : 'transparent',
                                    color: dateRange === range ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    borderLeft: range !== 'week' ? '1px solid var(--border)' : 'none'
                                }}
                            >
                                {range === 'week' ? '7 Gün' : range === 'month' ? 'Bu Ay' : '3 Ay'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
                marginBottom: 24,
            }}>
                {kpiCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} style={{
                            padding: 20,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            display: 'flex', flexDirection: 'column', gap: 12,
                            transition: 'all 0.2s ease',
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 25px ${card.bgColor}`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                }}>{card.label}</span>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                                    background: card.bgColor, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Icon size={18} style={{ color: card.color }} />
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                                    {card.value}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    {card.sub}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Daily Visits Chart */}
                <div style={{
                    padding: 20,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
                            <TrendingUp size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary)' }} />
                            Günlük Ziyaret Trendi
                        </h3>
                    </div>
                    <div style={{ height: 280 }}>
                        {visits && visits.daily.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={visits.daily} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(d) => formatDate(d)}
                                        stroke="var(--text-muted)"
                                        fontSize={11}
                                        tickLine={false}
                                    />
                                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.8125rem',
                                        }}
                                        labelFormatter={(d) => formatDate(d)}
                                    />
                                    <Area
                                        type="monotone" dataKey="visits" name="Ziyaret"
                                        stroke={CHART_COLORS.primary} strokeWidth={2}
                                        fill="url(#visitGrad)"
                                    />
                                    <Area
                                        type="monotone" dataKey="completed" name="Tamamlanan"
                                        stroke={CHART_COLORS.success} strokeWidth={2}
                                        fill="url(#completedGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Bu dönem için veri bulunamadı
                            </div>
                        )}
                    </div>
                </div>

                {/* Doctor Breakdown */}
                <div style={{
                    padding: 20,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9375rem', fontWeight: 600 }}>
                        <Users size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary)' }} />
                        Doktor Dağılımı
                    </h3>
                    <div style={{ height: 280 }}>
                        {overview && overview.doctorBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={overview.doctorBreakdown}
                                    layout="vertical"
                                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                    <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis
                                        dataKey="doctorName"
                                        type="category"
                                        stroke="var(--text-muted)"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={100}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.8125rem',
                                        }}
                                    />
                                    <Bar dataKey="count" name="Randevu" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                        {overview.doctorBreakdown.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? CHART_COLORS.primary : i === 1 ? CHART_COLORS.success : CHART_COLORS.warning} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Veri yok
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Second Row: Hourly Heatmap + Recent Visits */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Hourly Heatmap */}
                <div style={{
                    padding: 20,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9375rem', fontWeight: 600 }}>
                        <Clock size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary)' }} />
                        Saatlik Yoğunluk
                    </h3>
                    {visits && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(12, 1fr)',
                            gap: 4,
                        }}>
                            {visits.hourly.filter(h => h.hour >= 7 && h.hour <= 21).map((item) => {
                                const maxCount = Math.max(...visits.hourly.map(h => h.count), 1);
                                const intensity = item.count / maxCount;
                                return (
                                    <div
                                        key={item.hour}
                                        title={`${item.hour}:00 — ${item.count} randevu`}
                                        style={{
                                            aspectRatio: '1',
                                            borderRadius: 'var(--radius-sm)',
                                            background: item.count === 0
                                                ? 'var(--bg-elevated)'
                                                : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'default',
                                            transition: 'transform 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        <span style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 600,
                                            color: intensity > 0.4 ? '#fff' : 'var(--text-muted)',
                                        }}>
                                            {item.hour}
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: intensity > 0.4 ? '#fff' : 'var(--text-primary)',
                                        }}>
                                            {item.count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Az</span>
                        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                            {[0.1, 0.25, 0.45, 0.65, 0.85].map((op, i) => (
                                <div key={i} style={{
                                    flex: 1, height: 6, borderRadius: 3,
                                    background: `rgba(99, 102, 241, ${op})`,
                                }} />
                            ))}
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Çok</span>
                    </div>
                </div>

                {/* Recent Visits Table */}
                <div style={{
                    padding: 20,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9375rem', fontWeight: 600 }}>
                        <Calendar size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary)' }} />
                        Son Ziyaretler
                    </h3>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>Hasta</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>Doktor</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>Giriş</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>Çıkış</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>Süre</th>
                                    <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentVisits.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                            Henüz ziyaret kaydı bulunmuyor
                                        </td>
                                    </tr>
                                ) : (
                                    recentVisits.map((visit) => {
                                        const duration = visit.arrivedAt && visit.completedAt
                                            ? Math.round((new Date(visit.completedAt).getTime() - new Date(visit.arrivedAt).getTime()) / 60000)
                                            : null;
                                        return (
                                            <tr key={visit.id} style={{
                                                borderBottom: '1px solid var(--border)',
                                                transition: 'background 0.15s',
                                            }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <td style={{ padding: '10px 6px', fontWeight: 500 }}>
                                                    {visit.patient?.firstName} {visit.patient?.lastName}
                                                </td>
                                                <td style={{ padding: '10px 6px', color: 'var(--text-secondary)' }}>
                                                    {visit.doctor?.firstName} {visit.doctor?.lastName}
                                                </td>
                                                <td style={{ padding: '10px 6px', color: 'var(--text-secondary)' }}>
                                                    {visit.arrivedAt ? formatTime(visit.arrivedAt) : '—'}
                                                </td>
                                                <td style={{ padding: '10px 6px', color: 'var(--text-secondary)' }}>
                                                    {visit.completedAt ? formatTime(visit.completedAt) : '—'}
                                                </td>
                                                <td style={{ padding: '10px 6px' }}>
                                                    {duration !== null ? (
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                                            background: 'var(--primary-muted)', color: 'var(--primary)',
                                                            fontSize: '0.75rem', fontWeight: 500,
                                                        }}>
                                                            {formatDuration(duration)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ padding: '10px 6px' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: 'var(--radius-full)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500,
                                                        background: visit.status === 'COMPLETED' ? CHART_COLORS.successLight : CHART_COLORS.primaryLight,
                                                        color: visit.status === 'COMPLETED' ? CHART_COLORS.success : CHART_COLORS.primary,
                                                    }}>
                                                        {visit.status === 'COMPLETED' ? 'Tamamlandı' : 'Klinikte'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
