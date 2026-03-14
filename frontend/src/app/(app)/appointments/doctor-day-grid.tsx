'use client';

import { useState, useMemo, useRef } from 'react';
import { Appointment } from '@/lib/api';
import { Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Renk Paleti: Doktor Sütun Başlıkları ── */
const DOCTOR_COLORS = [
    { bg: '#3b82f6', light: 'rgba(59,130,246,0.12)', text: '#93bbfd' },   // Blue
    { bg: '#8b5cf6', light: 'rgba(139,92,246,0.12)', text: '#c4b5fd' },   // Violet
    { bg: '#f59e0b', light: 'rgba(245,158,11,0.12)', text: '#fcd34d' },   // Amber
    { bg: '#ec4899', light: 'rgba(236,72,153,0.12)', text: '#f9a8d4' },   // Pink
    { bg: '#14b8a6', light: 'rgba(20,184,166,0.12)', text: '#5eead4' },   // Teal
    { bg: '#f97316', light: 'rgba(249,115,22,0.12)', text: '#fdba74' },   // Orange
    { bg: '#06b6d4', light: 'rgba(6,182,212,0.12)', text: '#67e8f9' },    // Cyan
    { bg: '#a855f7', light: 'rgba(168,85,247,0.12)', text: '#d8b4fe' },   // Purple
];

/* ── Durum Renkleri ── */
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
    CONFIRMED: { bg: 'rgba(59,130,246,0.2)', border: '#3b82f6', text: '#93bbfd', label: 'Onaylandı' },
    ARRIVED: { bg: 'rgba(74,222,128,0.2)', border: '#4ade80', text: '#4ade80', label: 'Hasta Geldi' },
    COMPLETED: { bg: 'rgba(22,163,106,0.25)', border: '#16a34a', text: '#22c55e', label: 'Tamamlandı' },
    CANCELLED: { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', text: '#fca5a5', label: 'İptal' },
    NO_SHOW: { bg: 'rgba(245,158,11,0.2)', border: '#f59e0b', text: '#fcd34d', label: 'Gelmedi' },
};

/* ── Sabitler ── */
const SLOT_DURATION = 15; // dakika
const SLOT_HEIGHT = 28;   // px - her 15 dakika (kompakt)
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_DURATION;

interface DoctorDayGridProps {
    doctors: { id: string; firstName: string; lastName: string }[];
    appointments: Appointment[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onEventClick: (appointment: Appointment) => void;
    onSlotClick: (date: Date, doctorId: string) => void;
}

export function DoctorDayGrid({
    doctors,
    appointments,
    currentDate,
    onDateChange,
    onEventClick,
    onSlotClick,
}: DoctorDayGridProps) {
    const gridRef = useRef<HTMLDivElement>(null);

    /* Doktor renk atama */
    const doctorColorMap = useMemo(() => {
        const map: Record<string, typeof DOCTOR_COLORS[0]> = {};
        doctors.forEach((d, i) => {
            map[d.id] = DOCTOR_COLORS[i % DOCTOR_COLORS.length];
        });
        return map;
    }, [doctors]);

    /* Saat etiketleri */
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        for (let i = 0; i < TOTAL_SLOTS; i++) {
            const totalMin = START_HOUR * 60 + i * SLOT_DURATION;
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
        return slots;
    }, []);

    /* Doktora göre filtrelenmiş randevular */
    const appointmentsByDoctor = useMemo(() => {
        const map: Record<string, Appointment[]> = {};
        doctors.forEach(d => { map[d.id] = []; });
        appointments.forEach(apt => {
            if (map[apt.doctorId]) {
                map[apt.doctorId].push(apt);
            }
        });
        return map;
    }, [doctors, appointments]);

    /* Randevunun grid pozisyonunu hesapla */
    const getEventPosition = (apt: Appointment) => {
        const start = new Date(apt.startTime);
        const end = new Date(apt.endTime);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const endMin = end.getHours() * 60 + end.getMinutes();

        const topSlots = (startMin - START_HOUR * 60) / SLOT_DURATION;
        const heightSlots = (endMin - startMin) / SLOT_DURATION;

        return {
            top: topSlots * SLOT_HEIGHT,
            height: Math.max(heightSlots * SLOT_HEIGHT - 2, SLOT_HEIGHT - 2), // minimum 1 slot
        };
    };

    /* Tarih Navigasyonu — hafta sonlarını atla */
    const navigateDate = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + delta);
        // Cumartesi ise → Pazartesiye atla (ileri giderken)
        if (newDate.getDay() === 6) newDate.setDate(newDate.getDate() + (delta > 0 ? 2 : -1));
        // Pazar ise → Pazartesiye atla (ileri), Cumaya atla (geri)
        if (newDate.getDay() === 0) newDate.setDate(newDate.getDate() + (delta > 0 ? 1 : -2));
        onDateChange(newDate);
    };

    const formatDate = (d: Date) => {
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
    };

    const isToday = (d: Date) => {
        const now = new Date();
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── Tarih Navigasyonu ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            }}>
                <button
                    onClick={() => navigateDate(-1)}
                    style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '6px', cursor: 'pointer',
                        color: 'var(--text-secondary)', display: 'flex',
                    }}
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    onClick={() => onDateChange(new Date())}
                    style={{
                        background: isToday(currentDate) ? 'var(--primary-muted)' : 'transparent',
                        border: isToday(currentDate) ? '1px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '4px 14px', cursor: 'pointer',
                        color: isToday(currentDate) ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '0.8125rem', fontWeight: 500,
                    }}
                >
                    Bugün
                </button>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, minWidth: '260px', textAlign: 'center' }}>
                    {formatDate(currentDate)}
                </h3>
                <button
                    onClick={() => navigateDate(1)}
                    style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '6px', cursor: 'pointer',
                        color: 'var(--text-secondary)', display: 'flex',
                    }}
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* ── Durum Lejandı ── */}
            <div style={{
                display: 'flex', gap: '16px', padding: '8px 16px',
                borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
                background: 'rgba(255,255,255,0.01)',
            }}>
                {Object.entries(STATUS_COLORS).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '12px', height: '12px', borderRadius: '3px',
                            background: val.bg, border: `2px solid ${val.border}`,
                        }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{val.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Grid Ana Yapı ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Saat Sütunu */}
                <div style={{
                    width: '60px', minWidth: '60px', borderRight: '1px solid var(--border)',
                    overflow: 'hidden',
                }}>
                    {/* Boş başlık hücresi */}
                    <div style={{ height: '52px', borderBottom: '1px solid var(--border)' }} />
                    {/* Saat sütunu scroll alanı (js ile senkronize) */}
                    <div
                        style={{ overflowY: 'hidden', height: 'calc(100% - 52px)' }}
                        ref={el => {
                            // Saat sütununu grid scroll ile senkronize et
                            if (el && gridRef.current) {
                                gridRef.current.addEventListener('scroll', () => {
                                    el.scrollTop = gridRef.current!.scrollTop;
                                });
                            }
                        }}
                    >
                        {timeSlots.map((time, i) => (
                            <div
                                key={time}
                                style={{
                                    height: `${SLOT_HEIGHT}px`,
                                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                                    paddingRight: '8px', paddingTop: '0px',
                                    fontSize: '0.6875rem', color: 'var(--text-muted)',
                                    borderBottom: i % 4 === 3 ? '1px solid var(--border)' : '1px solid rgba(255,255,255,0.03)',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {i % 4 === 0 ? time : ''}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Doktor Sütunları */}
                <div
                    ref={gridRef}
                    style={{
                        flex: 1, overflowY: 'auto', overflowX: 'auto',
                        display: 'flex', flexDirection: 'column',
                    }}
                >
                    {/* Doktor Başlıkları */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${doctors.length}, minmax(180px, 1fr))`,
                        position: 'sticky', top: 0, zIndex: 5,
                        background: 'var(--bg-surface)',
                    }}>
                        {doctors.map((doc) => {
                            const color = doctorColorMap[doc.id];
                            const docAppointments = appointmentsByDoctor[doc.id] || [];
                            const activeCount = docAppointments.filter(a => a.status !== 'CANCELLED').length;

                            return (
                                <div
                                    key={doc.id}
                                    style={{
                                        padding: '10px 12px',
                                        borderBottom: `3px solid ${color.bg}`,
                                        borderRight: '1px solid var(--border)',
                                        background: color.light,
                                        textAlign: 'center',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: color.bg, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.6875rem', fontWeight: 700, color: '#fff',
                                        }}>
                                            {doc.firstName[0]}{doc.lastName[0]}
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: '0.8125rem', fontWeight: 600, color: color.text,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                Dr. {doc.firstName} {doc.lastName}
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                                {activeCount} randevu
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Slot Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${doctors.length}, minmax(180px, 1fr))`,
                        flex: 1,
                    }}>
                        {doctors.map((doc) => {
                            const color = doctorColorMap[doc.id];
                            const docApts = appointmentsByDoctor[doc.id] || [];

                            return (
                                <div
                                    key={doc.id}
                                    style={{
                                        position: 'relative',
                                        borderRight: '1px solid var(--border)',
                                        background: color.light,
                                    }}
                                >
                                    {/* Time slot arka plan çizgileri */}
                                    {timeSlots.map((_, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                const clickDate = new Date(currentDate);
                                                const totalMin = START_HOUR * 60 + i * SLOT_DURATION;
                                                clickDate.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
                                                onSlotClick(clickDate, doc.id);
                                            }}
                                            style={{
                                                height: `${SLOT_HEIGHT}px`,
                                                borderBottom: i % 4 === 3
                                                    ? '1px solid var(--border)'
                                                    : '1px solid rgba(255,255,255,0.03)',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        />
                                    ))}

                                    {/* Randevu kartları (pozisyona göre yerleştirilir) */}
                                    {docApts.map(apt => {
                                        const pos = getEventPosition(apt);
                                        const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.CONFIRMED;

                                        return (
                                            <div
                                                key={apt.id}
                                                onClick={(e) => { e.stopPropagation(); onEventClick(apt); }}
                                                title={`${apt.patient?.firstName} ${apt.patient?.lastName} — ${statusColor.label}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: `${pos.top}px`,
                                                    left: '4px',
                                                    right: '4px',
                                                    height: `${pos.height}px`,
                                                    background: statusColor.bg,
                                                    borderLeft: `3px solid ${statusColor.border}`,
                                                    borderRadius: '6px',
                                                    padding: '4px 8px',
                                                    cursor: 'pointer',
                                                    overflow: 'hidden',
                                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                                    zIndex: 2,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.transform = 'scale(1.02)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                                                    e.currentTarget.style.zIndex = '10';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.zIndex = '2';
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: '0.75rem', fontWeight: 600,
                                                    color: statusColor.text,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    lineHeight: 1.3,
                                                }}>
                                                    {apt.patient?.firstName} {apt.patient?.lastName}
                                                </div>
                                                {pos.height > SLOT_HEIGHT && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        fontSize: '0.6875rem', color: 'var(--text-muted)',
                                                        marginTop: '2px',
                                                    }}>
                                                        <Clock size={10} />
                                                        {new Date(apt.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                        {' - '}
                                                        {new Date(apt.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                                {pos.height > SLOT_HEIGHT * 2 && (
                                                    <div style={{
                                                        fontSize: '0.625rem',
                                                        color: statusColor.text,
                                                        opacity: 0.8,
                                                        marginTop: '2px',
                                                        display: 'flex', alignItems: 'center', gap: '3px',
                                                    }}>
                                                        <span style={{
                                                            width: '6px', height: '6px', borderRadius: '50%',
                                                            background: statusColor.border, display: 'inline-block',
                                                        }} />
                                                        {statusColor.label}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
