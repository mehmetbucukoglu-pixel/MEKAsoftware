'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { appointmentApi, userApi, Appointment } from '@/lib/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { Calendar as CalendarIcon, Loader2, Plus, Users, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppointmentModal } from './appointment-modal';
import { DoctorDayGrid } from './doctor-day-grid';
import { PageHeader } from '@/lib/page-header';

/* ── Durum Renkleri (Gruplanmış) ── */
const STATUS_COLOR_MAP: Record<string, string> = {
    CONFIRMED: '#3b82f6',   // Mavi — Bekliyor
    ARRIVED: '#3b82f6',     // Mavi — Bekliyor
    COMPLETED: '#16a34a',   // Yeşil — Tamamlandı
    CANCELLED: '#ef4444',   // Kırmızı — İptal/Gelmedi
    NO_SHOW: '#ef4444',     // Kırmızı — İptal/Gelmedi
};

export default function AppointmentsPage() {
    const { clinic, user } = useAuthStore();
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const calendarRef = useRef<FullCalendar>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

    /* Görünüm Modu: Doktor ise normal FullCalendar, Admin/Asistan ise seçebilir */
    const isStaff = user?.role === 'ADMIN' || user?.role === 'ASSISTANT';
    const [viewMode, setViewMode] = useState<'calendar' | 'doctor-grid'>(isStaff ? 'doctor-grid' : 'calendar');

    /* Doktor grid günlük tarih — hafta sonu ise Pazartesiye atla */
    const [gridDate, setGridDate] = useState<Date>(() => {
        const now = new Date();
        if (now.getDay() === 0) now.setDate(now.getDate() + 1); // Pazar → Pazartesi
        if (now.getDay() === 6) now.setDate(now.getDate() + 2); // Cumartesi → Pazartesi
        return now;
    });

    /* Tarih aralığı (FullCalendar'dan veya grid'den gelen) */
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

    useEffect(() => {
        userApi.getDoctors().then(res => {
            const raw = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setDoctors(raw);

            // Eğer giriş yapan kullanıcı doktor listesindeyse (Doktor veya Admin olması fark etmez), otomatik onu seç
            const isUserInDoctorList = raw.some((d: any) => d.id === user?.id);

            if (isUserInDoctorList && user?.id) {
                setSelectedDoctorId(user.id);
            } else if (raw.length > 0 && (!selectedDoctorId || selectedDoctorId === 'ALL')) {
                setSelectedDoctorId(raw[0].id);
            }
        }).catch(err => {
            console.error("Doktor çekme hatası:", err);
            toast.error('Doktor listesi alınamadı');
        });
    }, [user?.id]);

    /* Randevu çekme — tarih aralığı ile */
    const fetchAppointments = async (start: Date, end: Date) => {
        setIsLoading(true);
        try {
            const res = await appointmentApi.list({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                limit: 500
            });

            const eventsData = res.data?.data || [];
            setAllAppointments(eventsData);

            const formattedEvents = eventsData.map((apt: Appointment) => {
                const color = STATUS_COLOR_MAP[apt.status] || STATUS_COLOR_MAP.CONFIRMED;
                return {
                    id: apt.id,
                    title: `${apt.patient?.firstName} ${apt.patient?.lastName}`,
                    start: apt.startTime,
                    end: apt.endTime,
                    docId: apt.doctorId,
                    backgroundColor: color,
                    borderColor: 'transparent',
                    textColor: '#fff',
                    extendedProps: { ...apt }
                };
            });

            setEvents(formattedEvents);
        } catch (error: any) {
            console.error('Randevu yükleme hatası:', error.response || error);
            toast.error(`Randevular yüklenemedi: ${error?.response?.data?.message || error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /* Grid modu tarih değişince randevuları yenile */
    useEffect(() => {
        if (viewMode === 'doctor-grid') {
            const dayStart = new Date(gridDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(gridDate);
            dayEnd.setDate(dayEnd.getDate() + 1);
            dayEnd.setHours(0, 0, 0, 0);
            fetchAppointments(dayStart, dayEnd);
        }
    }, [gridDate, viewMode]);

    const handleDateSelect = (selectInfo: any) => {
        setSelectedDate(selectInfo.start);
        setSelectedEndDate(selectInfo.end);
        setSelectedAppointment(null);
        setIsModalOpen(true);
    };

    const handleEventClick = (clickInfo: any) => {
        setSelectedAppointment(clickInfo.event.extendedProps as Appointment);
        setSelectedDate(null);
        setSelectedEndDate(null);
        setIsModalOpen(true);
    };

    const handleEventDrop = async (dropInfo: any) => {
        const { event, oldEvent, revert } = dropInfo;
        const appointmentId = event.id;
        const newStart = event.start;

        try {
            const durationMs = event.end ? event.end.getTime() - newStart.getTime() : (oldEvent.end.getTime() - oldEvent.start.getTime());
            const durationMin = Math.round(durationMs / 60000);

            const payload: any = {
                startTime: newStart.toISOString(),
                durationMin
            };

            await appointmentApi.update(appointmentId, payload);
            toast.success('Randevu başarıyla güncellendi');
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.error(error.response?.data?.message || 'Bu saatte çakışma var.');
            } else {
                toast.error('Randevu güncellenirken bir hata oluştu.');
            }
            revert();
        }
    };

    const handleEventResize = async (resizeInfo: any) => {
        const { event, revert } = resizeInfo;
        const appointmentId = event.id;
        const newStart = event.start;

        try {
            const durationMs = event.end ? event.end.getTime() - newStart.getTime() : 30 * 60000;
            const durationMin = Math.round(durationMs / 60000);

            await appointmentApi.update(appointmentId, { durationMin });
            toast.success('Randevu süresi güncellendi');
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.error(error.response?.data?.message || 'Bu saat diliminde çakışma var.');
            } else {
                toast.error('Randevu süresi güncellenirken bir hata oluştu.');
            }
            revert();
        }
    };

    /* Doktora göre filtrele */
    const filteredEvents = !selectedDoctorId || selectedDoctorId === 'ALL'
        ? events
        : events.filter(e => e.docId === selectedDoctorId);

    const filteredAppointments = !selectedDoctorId || selectedDoctorId === 'ALL'
        ? allAppointments
        : allAppointments.filter(a => a.doctorId === selectedDoctorId);

    /* Ortak refresh fonksiyonu */
    const handleRefresh = () => {
        if (viewMode === 'doctor-grid') {
            const dayStart = new Date(gridDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(gridDate);
            dayEnd.setDate(dayEnd.getDate() + 1);
            dayEnd.setHours(0, 0, 0, 0);
            fetchAppointments(dayStart, dayEnd);
        } else if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            fetchAppointments(api.view.activeStart, api.view.activeEnd);
        }
    };

    /* Grid'de randevu kartına tıklayınca */
    const handleGridEventClick = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setSelectedDate(null);
        setSelectedEndDate(null);
        setIsModalOpen(true);
    };

    /* Grid'de boş slota tıklayınca */
    const handleGridSlotClick = (date: Date, doctorId: string) => {
        setSelectedDate(date);
        setSelectedEndDate(null);
        setSelectedAppointment(null);
        setIsModalOpen(true);
    };

    /* ── Durum Lejandı (FullCalendar modu için) ── */
    const StatusLegend = () => (
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {[
                { color: '#3b82f6', label: 'Bekliyor (Onaylı/Geldi)' },
                { color: '#16a34a', label: 'Tamamlandı' },
                { color: '#ef4444', label: 'İptal / Gelmedi' },
            ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        width: '12px', height: '12px', borderRadius: '3px',
                        background: item.color,
                    }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header via Portal */}
            <PageHeader
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarIcon size={20} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Randevu Takvimi</h1>
                    </div>
                }
                actions={isStaff ? (
                    <div style={{
                        display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', overflow: 'hidden',
                    }}>
                        <button
                            onClick={() => setViewMode('doctor-grid')}
                            style={{
                                padding: '6px 14px', border: 'none', cursor: 'pointer',
                                fontSize: '0.8125rem', fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: viewMode === 'doctor-grid' ? 'var(--primary-muted)' : 'transparent',
                                color: viewMode === 'doctor-grid' ? 'var(--primary)' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                            }}
                        >
                            <LayoutGrid size={14} /> Doktor Sütunları
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={{
                                padding: '6px 14px', border: 'none', cursor: 'pointer',
                                fontSize: '0.8125rem', fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: viewMode === 'calendar' ? 'var(--primary-muted)' : 'transparent',
                                color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-muted)',
                                borderLeft: '1px solid var(--border)',
                                transition: 'all 0.15s',
                            }}
                        >
                            <CalendarIcon size={14} /> Takvim
                        </button>
                    </div>
                ) : undefined}
            />

            {/* Doctor filter (calendar mode only) */}
            {viewMode === 'calendar' && (
                <div style={{ marginBottom: '16px' }}>
                    <div className="input-with-icon" style={{ minWidth: '220px', maxWidth: '320px' }}>
                        <Users size={16} />
                        <select
                            className="input"
                            style={{ paddingLeft: '36px' }}
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                        >
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Durum Lejandı — Takvim modunda */}
            {viewMode === 'calendar' && (
                <div style={{ marginBottom: '12px', paddingLeft: '4px' }}>
                    <StatusLegend />
                </div>
            )}

            <div className="card" style={{ flex: 1, padding: viewMode === 'doctor-grid' ? '0' : '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                {isLoading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        background: 'rgba(10,14,26,0.6)', backdropFilter: 'blur(2px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Loader2 className="spin" size={32} style={{ color: 'var(--primary)' }} />
                    </div>
                )}

                {/* ── DOKTOR GRID MODU (Admin / Asistan) ── */}
                {viewMode === 'doctor-grid' && (
                    <DoctorDayGrid
                        doctors={doctors}
                        appointments={allAppointments}
                        currentDate={gridDate}
                        onDateChange={(d) => setGridDate(d)}
                        onEventClick={handleGridEventClick}
                        onSlotClick={handleGridSlotClick}
                    />
                )}

                {/* ── STANDART TAKVİM MODU ── */}
                {viewMode === 'calendar' && (
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            initialView="timeGridWeek"
                            locale={trLocale}
                            firstDay={1}
                            initialDate={(() => {
                                const now = new Date();
                                // Pazar günü ise (getDay() === 0) ertesi güne (Pazartesi) atla
                                if (now.getDay() === 0) {
                                    const nextMonday = new Date(now);
                                    nextMonday.setDate(nextMonday.getDate() + 1);
                                    return nextMonday;
                                }
                                return now;
                            })()}
                            slotDuration="00:15:00"
                            slotMinTime="08:00:00"
                            slotMaxTime="20:00:00"
                            allDaySlot={false}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            weekends={false}
                            editable={true}
                            eventDurationEditable={true}
                            events={filteredEvents}
                            select={handleDateSelect}
                            eventClick={handleEventClick}
                            eventDrop={handleEventDrop}
                            eventResize={handleEventResize}
                            height="100%"
                            datesSet={(arg) => fetchAppointments(arg.start, arg.end)}
                            slotLabelFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }}
                            eventContent={(arg) => {
                                const apt = arg.event.extendedProps as Appointment;
                                return (
                                    <div style={{
                                        padding: '2px 6px', overflow: 'hidden',
                                        fontSize: '0.75rem', lineHeight: 1.4,
                                    }}>
                                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {apt.patient?.firstName} {apt.patient?.lastName}
                                        </div>
                                        {apt.doctor && (
                                            <div style={{ fontSize: '0.6875rem', opacity: 0.85 }}>
                                                Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                                            </div>
                                        )}
                                    </div>
                                );
                            }}
                        />
                    </div>
                )}
            </div>

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    handleRefresh();
                }}
                initialDate={selectedDate}
                initialEndDate={selectedEndDate}
                existingAppointment={selectedAppointment}
            />
        </div>
    );
}
