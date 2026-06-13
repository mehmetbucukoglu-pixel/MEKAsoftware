'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { appointmentApi, userApi, Appointment } from '@/lib/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { Calendar as CalendarIcon, Loader2, LayoutGrid, Users, DollarSign, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppointmentModal } from './appointment-modal';
import { DoctorDayGrid } from './doctor-day-grid';
import { PageHeader } from '@/lib/page-header';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { getSocket } from '@/lib/socket';

/* ── Durum Renkleri (Gruplanmış) ── */
const STATUS_COLOR_MAP: Record<string, string> = {
    CONFIRMED: '#3b82f6',   // Mavi — Bekliyor
    ARRIVED: '#16a34a',     // Yeşil — Bekliyor / Geldi
    COMPLETED: '#16a34a',   // Yeşil — Tamamlandı
    CANCELLED: '#ef4444',   // Kırmızı — İptal/Gelmedi
    NO_SHOW: '#ef4444',     // Kırmızı — İptal/Gelmedi
};

export default function AppointmentsPage() {
    const { clinic, user } = useAuthStore();
    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerValue, setPickerValue] = useState('');

    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

    /* Doktor grid günlük tarih — hafta sonu ise Pazartesiye atla */
    const [gridDate, setGridDate] = useState<Date>(() => {
        const now = new Date();
        if (now.getDay() === 0) now.setDate(now.getDate() + 1); // Pazar → Pazartesi
        if (now.getDay() === 6) now.setDate(now.getDate() + 2); // Cumartesi → Pazartesi
        return now;
    });

    /* Görünüm Modu: 'individual' (Bireysel) | 'corporate' (Kurumsal) */
    const [viewMode, setViewMode] = useState<'individual' | 'corporate'>('individual');

    // Update view mode once user is loaded
    useEffect(() => {
        if (user?.role === 'ADMIN' || user?.role === 'ASSISTANT') {
            setViewMode('corporate');
        } else {
            setViewMode('individual');
        }
    }, [user?.role]);

    const isStaff = user?.role === 'ADMIN' || user?.role === 'ASSISTANT';
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
    const lastFetchRangeRef = useRef<string>('');
    const fetchAppointments = async (start: Date, end: Date) => {
        setIsLoading(true);
        try {
            const res = await appointmentApi.list({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                limit: 500
            });

            const eventsData = res.data?.items || res.data?.data || [];
            setAllAppointments(eventsData);

            const formattedEvents = eventsData.map((apt: Appointment) => {
                let displayStatus = apt.status;
                if (new Date(apt.endTime) < new Date() && displayStatus !== 'NO_SHOW' && displayStatus !== 'CANCELLED') {
                    displayStatus = 'COMPLETED';
                }
                const isCancelled = apt.status === 'CANCELLED' || apt.status === 'NO_SHOW';
                const color = STATUS_COLOR_MAP[displayStatus] || STATUS_COLOR_MAP.CONFIRMED;
                return {
                    id: apt.id,
                    title: `${apt.patient?.firstName} ${apt.patient?.lastName}`,
                    start: apt.startTime,
                    end: apt.endTime,
                    docId: apt.doctorId,
                    resourceId: apt.doctorId,
                    backgroundColor: isCancelled ? '#ef4444' : color,
                    borderColor: isCancelled ? '#dc2626' : 'transparent',
                    textColor: '#fff',
                    editable: !isCancelled,
                    extendedProps: { ...apt, isCancelled }
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

    /* datesSet: aynı tarih aralığı için tekrar istek atma */
    const handleDatesSet = (arg: any) => {
        const key = `${arg.start.toISOString()}|${arg.end.toISOString()}`;
        if (key === lastFetchRangeRef.current) return;
        lastFetchRangeRef.current = key;
        fetchAppointments(arg.start, arg.end);
    };


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

    /* Ortak refresh fonksiyonu — dedup key sıfırlanarak her zaman istek atar */
    const handleRefresh = () => {
        if (calendarRef.current) {
            const api = calendarRef.current.getApi();
            lastFetchRangeRef.current = '';
            fetchAppointments(api.view.activeStart, api.view.activeEnd);
        }
    };

    /* Socket: WA bot değişikliklerinde anında güncelle — sadece auth hazırsa */
    useEffect(() => {
        if (!clinic?.id || !user?.id) return;
        const socket = getSocket(clinic.id, user.id, user.role ?? '');
        const refresh = () => handleRefresh();
        socket.on('appointment:created', refresh);
        socket.on('appointment:updated', refresh);
        socket.on('appointment:cancelled', refresh);
        return () => {
            socket.off('appointment:created', refresh);
            socket.off('appointment:updated', refresh);
            socket.off('appointment:cancelled', refresh);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clinic?.id, user?.id]);

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


    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px' }}>
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
                            onClick={() => setViewMode('individual')}
                            style={{
                                padding: '6px 14px', border: 'none', cursor: 'pointer',
                                fontSize: '0.8125rem', fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: viewMode === 'individual' ? 'var(--primary-muted)' : 'transparent',
                                color: viewMode === 'individual' ? 'var(--primary)' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                            }}
                        >
                            <User size={14} /> Bireysel
                        </button>
                        <button
                            onClick={() => setViewMode('corporate')}
                            style={{
                                padding: '6px 14px', border: 'none', cursor: 'pointer',
                                fontSize: '0.8125rem', fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: viewMode === 'corporate' ? 'var(--primary-muted)' : 'transparent',
                                color: viewMode === 'corporate' ? 'var(--primary)' : 'var(--text-muted)',
                                borderLeft: '1px solid var(--border)',
                                transition: 'all 0.15s',
                            }}
                        >
                            <LayoutGrid size={14} /> Kurumsal
                        </button>
                    </div>
                ) : undefined}
            />

            {/* Doctor filter (calendar mode only for staff) */}
            {viewMode === 'individual' && isStaff && (
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


            <div className="card" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                {/* Jump-to-date floating picker */}
                {showDatePicker && (
                    <div
                        style={{
                            position: 'absolute', top: '54px', right: '16px', zIndex: 50,
                            background: 'var(--bg-surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', padding: '14px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                            display: 'flex', flexDirection: 'column', gap: '10px',
                        }}
                    >
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tarihe Git</div>
                        <input
                            type="date"
                            autoFocus
                            value={pickerValue}
                            onChange={(e) => {
                                setPickerValue(e.target.value);
                                if (e.target.value && calendarRef.current) {
                                    calendarRef.current.getApi().gotoDate(e.target.value);
                                    setShowDatePicker(false);
                                    setPickerValue('');
                                }
                            }}
                            style={{
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                                padding: '6px 10px', fontSize: '0.875rem', colorScheme: 'dark',
                                cursor: 'pointer',
                            }}
                        />
                        <button
                            onClick={() => setShowDatePicker(false)}
                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
                        >
                            Kapat
                        </button>
                    </div>
                )}
                {/* Click-away overlay */}
                {showDatePicker && (
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                        onClick={() => setShowDatePicker(false)}
                    />
                )}
                {isLoading && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        background: 'rgba(10,14,26,0.6)', backdropFilter: 'blur(2px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Loader2 className="spin" size={32} style={{ color: 'var(--primary)' }} />
                    </div>
                )}

                <div style={{ flex: 1, minHeight: 0 }}>
                    <FullCalendar
                        key={viewMode} // Force remount on view mode change
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
                        customButtons={{
                            jumpToDate: {
                                text: '📅',
                                hint: 'Tarihe git',
                                click: () => setShowDatePicker(prev => !prev),
                            }
                        }}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: viewMode === 'corporate'
                                ? 'jumpToDate resourceTimeGridDay'
                                : 'jumpToDate dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        initialView={viewMode === 'corporate' ? "resourceTimeGridDay" : "timeGridWeek"}
                        locale={trLocale}
                        firstDay={1}
                        resources={viewMode === 'corporate' ? doctors.map(d => ({ id: d.id, title: `Dr. ${d.firstName} ${d.lastName}` })) : undefined}
                        events={viewMode === 'corporate' ? events : filteredEvents}
                        initialDate={(() => {
                            const now = new Date();
                            if (now.getDay() === 0) {
                                const nextMonday = new Date(now);
                                nextMonday.setDate(nextMonday.getDate() + 1);
                                return nextMonday;
                            }
                            return now;
                        })()}
                        slotDuration="00:30:00"
                        slotMinTime="08:00:00"
                        slotMaxTime="20:00:00"
                        allDaySlot={false}
                        selectable={true}
                        selectMirror={true}
                        selectAllow={(selectInfo) => selectInfo.start >= new Date()}
                        dayMaxEvents={true}
                        weekends={true}
                        hiddenDays={[0]}
                        editable={true}
                        eventDurationEditable={true}
                        select={handleDateSelect}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDrop}
                        eventResize={handleEventResize}
                        height="100%"
                        datesSet={handleDatesSet}
                        slotLabelFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }}
                        eventContent={(arg) => {
                            const apt = arg.event.extendedProps as Appointment & { isCancelled?: boolean };
                            const isCancelled = apt.status === 'CANCELLED' || apt.status === 'NO_SHOW';
                            const isPast = new Date(apt.startTime) < new Date();
                            const statusLabel =
                                apt.status === 'CONFIRMED' ? 'Teyit Bekleniyor' :
                                apt.status === 'ARRIVED'   ? 'Geldi' :
                                apt.status === 'COMPLETED' ? 'Tamamland\u0131' :
                                apt.status === 'NO_SHOW'   ? 'Gelmedi' :
                                apt.status === 'CANCELLED' ? '\u0130ptal Edildi' : apt.status;
                            return (
                                <div style={{
                                    padding: '2px 6px', overflow: 'hidden',
                                    fontSize: '0.75rem', lineHeight: 1.4,
                                    opacity: isCancelled ? 0.8 : (isPast ? 0.75 : 1),
                                }}>
                                    <div style={{
                                        fontWeight: 600, whiteSpace: 'nowrap',
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        textDecoration: isCancelled ? 'line-through' : 'none',
                                    }}>
                                        {isCancelled && '\u2715 '}{apt.patient?.firstName} {apt.patient?.lastName}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.9, marginTop: '1px' }}>
                                        {statusLabel}
                                    </div>
                                </div>
                            );
                        }}
                        moreLinkContent={(args) => (
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 600,
                                color: 'var(--primary)',
                                background: 'var(--primary-muted)',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                display: 'inline-block',
                            }}>
                                {args.num} Randevu
                            </span>
                        )}
                    />
                </div>
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
