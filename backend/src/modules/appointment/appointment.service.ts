import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus, AppointmentSource, UserRole } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';
import { PushService } from '../push/push.service';

@Injectable()
export class AppointmentService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private socketGateway: SocketGateway,
        private pushService: PushService,
    ) { }
    
    async getPatientPatterns(clinicId: string, patientId: string) {
        const pastAppointments = await this.prisma.appointment.findMany({
            where: { clinicId, patientId, status: { in: ['COMPLETED', 'CONFIRMED'] } },
            orderBy: { startTime: 'desc' },
            take: 10,
            include: { doctor: { select: { id: true, firstName: true, lastName: true } } },
        });

        if (pastAppointments.length === 0) return null;

        // Find most frequent doctor
        const doctorCounts: Record<string, { count: number; name: string }> = {};
        pastAppointments.forEach(a => {
            const docId = a.doctorId;
            if (!doctorCounts[docId]) {
                doctorCounts[docId] = { count: 0, name: `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` };
            }
            doctorCounts[docId].count++;
        });

        const favoriteDoctor = Object.entries(doctorCounts).sort((a, b) => b[1].count - a[1].count)[0];

        // Find most frequent day of week (0-6)
        const dayCounts: Record<number, number> = {};
        pastAppointments.forEach(a => {
            const day = new Date(a.startTime).getDay();
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const favoriteDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0];

        // Find most frequent hour (HH:mm)
        const hourCounts: Record<string, number> = {};
        pastAppointments.forEach(a => {
            const date = new Date(a.startTime);
            const hhmm = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            hourCounts[hhmm] = (hourCounts[hhmm] || 0) + 1;
        });
        const favoriteTime = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0];

        return {
            favoriteDoctorId: favoriteDoctor[0],
            favoriteDoctorName: favoriteDoctor[1].name,
            preferredDay: Number(favoriteDay),
            preferredTime: favoriteTime,
            appointmentCount: pastAppointments.length
        };
    }



    async findAll(clinicId: string, filters: { doctorId?: string; date?: string; startDate?: string; endDate?: string; status?: AppointmentStatus; page?: any; limit?: any }) {
        const { doctorId, date, startDate, endDate, status, page = 1, limit = 50 } = filters;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const where: any = { clinicId };

        if (doctorId) where.doctorId = doctorId;
        if (status) where.status = status;
        if (startDate && endDate) {
            where.startTime = { gte: new Date(startDate), lt: new Date(endDate) };
        } else if (date) {
            const dayStart = new Date(date);
            const dayEnd = new Date(date);
            dayEnd.setDate(dayEnd.getDate() + 1);
            where.startTime = { gte: dayStart, lt: dayEnd };
        }

        const [total, items] = await Promise.all([
            this.prisma.appointment.count({ where }),
            this.prisma.appointment.findMany({
                where,
                include: {
                    patient: { select: { firstName: true, lastName: true, phone: true } },
                    doctor: { select: { firstName: true, lastName: true } },
                },
                orderBy: { startTime: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
        ]);

        return { items, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    }

    async findOne(clinicId: string, appointmentId: string) {
        const appointment = await this.prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId },
            include: {
                patient: true,
                doctor: true,
            },
        });
        if (!appointment) throw new NotFoundException('Randevu bulunamadı');
        return appointment;
    }

    async create(clinicId: string, data: {
        doctorId: string;
        patientId: string;
        startTime: any;
        durationMin: number;
        notes?: string;
        source?: AppointmentSource;
        createdBy?: string;
    }) {
        const startTime = new Date(data.startTime);
        const endTime = new Date(startTime.getTime() + data.durationMin * 60000);

        // Check for conflicts
        const hasConflict = await this.checkConflict(clinicId, data.doctorId, startTime, endTime);
        if (hasConflict) throw new ConflictException('Bu saatte doktorun başka bir randevusu var');

        const referenceCode = await this.generateReferenceCode();

        return this.prisma.appointment.create({
            data: {
                clinicId,
                doctorId: data.doctorId,
                patientId: data.patientId,
                startTime,
                endTime,
                durationMin: data.durationMin,
                notes: data.notes,
                source: data.source || 'MANUAL',
                status: 'CONFIRMED',
                referenceCode,
                createdBy: data.createdBy,
            },
        });
    }

    async updateStatus(clinicId: string, appointmentId: string, status: AppointmentStatus, cancelReason?: string) {
        const appointment = await this.findOne(clinicId, appointmentId);
        const updated = await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { status, cancelReason },
            include: {
                patient: { select: { firstName: true, lastName: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        // Push notification: iptal teyit mesajından geliyorsa özel bildirim
        if (status === 'CANCELLED') {
            const aptDate = new Date(appointment.startTime);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isTomorrow = aptDate.toDateString() === tomorrow.toDateString();

            const timeStr = aptDate.toLocaleString('tr-TR', {
                day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul'
            });
            const patientName = `${updated.patient?.firstName} ${updated.patient?.lastName}`;

            await this.pushService.sendToRoles(
                clinicId,
                ['DOCTOR', 'ASSISTANT', 'ADMIN'],
                'appointmentCancelled',
                {
                    title: isTomorrow ? '🚨 Yarınki Randevu İptal Edildi' : '❌ Randevu İptal',
                    body: `${patientName} — ${timeStr}${cancelReason ? ` (${cancelReason})` : ''}`,
                    url: '/mobile/calendar',
                    tag: `cancel-${appointmentId}`,
                },
            );

            // Socket real-time
            this.socketGateway.emitToClinic(clinicId, 'appointment:cancelled', { appointmentId });
        }

        return updated;
    }

    async update(clinicId: string, appointmentId: string, data: { startTime?: Date; durationMin?: number; notes?: string }) {
        const appointment = await this.findOne(clinicId, appointmentId);

        let startTime = appointment.startTime;
        let durationMin = appointment.durationMin;

        if (data.startTime) startTime = new Date(data.startTime);
        if (data.durationMin) durationMin = data.durationMin;

        const endTime = new Date(startTime.getTime() + durationMin * 60000);

        if (data.startTime || data.durationMin) {
            const hasConflict = await this.checkConflict(clinicId, appointment.doctorId, startTime, endTime, appointmentId);
            if (hasConflict) throw new ConflictException('Bu saatte doktorun başka bir randevusu var');
        }

        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                startTime,
                endTime,
                durationMin,
                notes: data.notes,
            },
        });
    }

    async remove(clinicId: string, appointmentId: string, userId?: string) {
        const apt = await this.findOne(clinicId, appointmentId);
        const deleted = await this.prisma.appointment.delete({
            where: { id: appointmentId },
        });
        // Silme işlemini AuditLog'a kaydet (dashboard aktivite widget'i okur)
        await this.prisma.auditLog.create({
            data: {
                clinicId,
                userId: userId ?? null,
                action: 'DELETE',
                entityType: 'APPOINTMENT',
                entityId: appointmentId,
                oldValues: {
                    patientName: `${apt.patient?.firstName ?? ''} ${apt.patient?.lastName ?? ''}`.trim(),
                    patientPhone: apt.patient?.phone ?? null,
                    doctorName: `${apt.doctor?.firstName ?? ''} ${apt.doctor?.lastName ?? ''}`.trim(),
                    startTime: apt.startTime,
                    source: apt.source ?? 'MANUAL',
                },
            },
        });
        return deleted;
    }

    async getAvailableSlots(clinicId: string, doctorId: string, date: string) {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayOfWeek = dayStart.getDay() === 0 ? 6 : dayStart.getDay() - 1; // 0=Monday

        // Get doctor schedule for this day; if not configured (e.g. Saturday), fall back to nearest weekday schedule
        let schedule = await this.prisma.doctorSchedule.findFirst({
            where: { clinicId, doctorId, dayOfWeek, isActive: true },
        });
        if (!schedule) {
            // Fallback: use any other active schedule from the same doctor (prefer Monday=0)
            schedule = await this.prisma.doctorSchedule.findFirst({
                where: { clinicId, doctorId, isActive: true },
                orderBy: { dayOfWeek: 'asc' },
            });
        }
        if (!schedule) return [];

        // Get existing appointments
        const appointments = await this.prisma.appointment.findMany({
            where: { clinicId, doctorId, startTime: { gte: dayStart, lt: dayEnd }, status: 'CONFIRMED' },
            orderBy: { startTime: 'asc' },
        });

        // Generate slots
        const slots: { startTime: Date; endTime: Date; available: boolean }[] = [];
        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);

        const breakStart = schedule.breakStart ? schedule.breakStart.split(':').map(Number) : null;
        const breakEnd = schedule.breakEnd ? schedule.breakEnd.split(':').map(Number) : null;

        let current = new Date(dayStart);
        current.setHours(startH, startM, 0, 0);

        const dayEndTime = new Date(dayStart);
        const finalEndH = Math.min(endH, 19);
        const finalEndM = finalEndH === 19 ? 0 : endM;
        dayEndTime.setHours(finalEndH, finalEndM, 0, 0);

        const slotDuration = 60; // 1 saatlik aralıklar

        let iterations = 0;
        while (current < dayEndTime) {
            iterations++;
            if (iterations > 500) break; // Safety guard

            const slotEnd = new Date(current.getTime() + slotDuration * 60000);

            // Skip break time
            if (breakStart && breakEnd) {
                const bStart = new Date(current);
                bStart.setHours(breakStart[0], breakStart[1], 0, 0);
                const bEnd = new Date(current);
                bEnd.setHours(breakEnd[0], breakEnd[1], 0, 0);

                if (current >= bStart && current < bEnd) {
                    current = bEnd;
                    continue;
                }
            }

            // Check if slot is taken
            const isTaken = appointments.some(appt => {
                const apptStart = new Date(appt.startTime);
                const apptEnd = new Date(appt.endTime);
                return (current < apptEnd && slotEnd > apptStart);
            });

            slots.push({
                startTime: new Date(current),
                endTime: new Date(slotEnd),
                available: !isTaken,
            });

            current = slotEnd;
        }

        return slots;
    }

    async getDoctorSchedule(clinicId: string, doctorId: string) {
        return this.prisma.doctorSchedule.findMany({
            where: { clinicId, doctorId },
            orderBy: { dayOfWeek: 'asc' },
        });
    }

    async updateDoctorSchedule(clinicId: string, doctorId: string, schedules: any[]) {
        await this.prisma.doctorSchedule.deleteMany({
            where: { clinicId, doctorId },
        });

        return this.prisma.doctorSchedule.createMany({
            data: schedules.map(s => ({ ...s, clinicId, doctorId })),
        });
    }

    async createFromWhatsApp(clinicId: string, data: {
        waPhone: string;
        doctorName: string;
        startTime: any;
        durationMin: number;
        notes?: string;
        // Legacy fields (ignored if waPhone lookup succeeds)
        patientName?: string;
        patientPhone?: string;
    }) {
        console.log('--- WHATSAPP APPT CREATION STARTED (v4 - registered only) ---');

        // 1. Normalize phone — use waPhone first, fall back to patientPhone
        const rawPhone = data.waPhone || data.patientPhone || '';
        const normalizedPhone = rawPhone.replace(/\D/g, '');
        const phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

        // 2. Patient lookup — ONLY registered patients can book
        let patientId: string | null = null;

        // A. Check PhonePatientLink
        const link = await this.prisma.phonePatientLink.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone: phone } },
        });
        if (link) {
            patientId = link.patientId;
            console.log('Found patient via PhonePatientLink:', patientId);
        }

        // B. Check Patient.phone or Patient.phone2 directly
        if (!patientId) {
            const patient = await this.prisma.patient.findFirst({
                where: { clinicId, OR: [{ phone }, { phone2: phone }], isActive: true },
            });
            if (patient) {
                patientId = patient.id;
                console.log('Found patient via direct phone lookup:', patientId);
                // Auto-create link for future
                await this.prisma.phonePatientLink.upsert({
                    where: { clinicId_waPhone: { clinicId, waPhone: phone } },
                    create: { clinicId, waPhone: phone, patientId },
                    update: {},
                });
            }
        }

        if (!patientId) {
            throw new BadRequestException('Bu telefon numarasına kayıtlı hasta bulunamadı. Sadece kayıtlı hastalar randevu alabilir.');
        }

        // 3. Find Doctor
        const normalizedDoctorInput = this.normalizeTurkish(
            data.doctorName.replace(/^Dr\.?\s*/i, '').trim()
        );
        const doctors = await this.prisma.user.findMany({ where: { clinicId, role: 'DOCTOR' } });
        const doctor = doctors.find(d => {
            const fullName = this.normalizeTurkish(`${d.firstName} ${d.lastName}`);
            const firstName = this.normalizeTurkish(d.firstName);
            return fullName.includes(normalizedDoctorInput) || normalizedDoctorInput.includes(fullName)
                || firstName.includes(normalizedDoctorInput) || normalizedDoctorInput.includes(firstName);
        });
        if (!doctor) throw new BadRequestException(`Doktor bulunamadı: "${data.doctorName}"`);

        // 4. Create Appointment
        // Normalize startTime: eğer timezone bilgisi yoksa Türkiye saati (+03:00) kabul et
        const rawStart = String(data.startTime || '');
        const hasOffset = rawStart.endsWith('Z') || /[+\-]\d{2}:\d{2}$/.test(rawStart);
        const normalizedStart = hasOffset ? rawStart : rawStart + '+03:00';

        const appointment = await this.create(clinicId, {
            doctorId: doctor.id,
            patientId: patientId!,
            startTime: normalizedStart,
            durationMin: Number(data.durationMin) || 60,
            notes: data.notes,
            source: 'WHATSAPP',
        });

        // 5. Notifications
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId! } });
        const patientName = `${patient?.firstName} ${patient?.lastName}`;
        const dateStr = new Date(data.startTime).toLocaleString('tr-TR', {
            day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul'
        });
        const apptMsg = `📅 ${patientName} — ${dateStr} (WhatsApp)`;

        await this.notificationService.create(clinicId, doctor.id, {
            type: 'NEW_APPOINTMENT',
            title: 'Yeni Randevu (WhatsApp)',
            body: apptMsg,
            entityType: 'APPOINTMENT',
            entityId: appointment.id
        });
        this.socketGateway.emitToUser(doctor.id, 'notification', { message: apptMsg });
        this.socketGateway.emitToClinic(clinicId, 'appointment:created', { appointmentId: appointment.id });

        // Push notification — doktor + asistanlar
        await this.pushService.sendToRoles(
            clinicId,
            ['DOCTOR', 'ASSISTANT', 'ADMIN'],
            'appointmentCreated',
            {
                title: '📅 Yeni Randevu (WhatsApp)',
                body: apptMsg,
                url: '/mobile/calendar',
                tag: `apt-created-${appointment.id}`,
            },
        );

        const assistants = await this.prisma.user.findMany({ where: { clinicId, role: 'ASSISTANT' } });
        for (const assistant of assistants) {
            await this.notificationService.create(clinicId, assistant.id, {
                type: 'NEW_APPOINTMENT',
                title: 'Yeni Randevu (WhatsApp)',
                body: apptMsg,
                entityType: 'APPOINTMENT',
                entityId: appointment.id
            });
        }

        return appointment;
    }


    async findByReferenceOrPhone(clinicId: string, query: { referenceCode?: string; phone?: string }) {
        const toLocal = (date: Date) =>
            date.toLocaleString('tr-TR', {
                timeZone: 'Europe/Istanbul',
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });

        if (query.referenceCode) {
            const appt = await this.prisma.appointment.findFirst({
                where: { clinicId, referenceCode: query.referenceCode },
                include: {
                    patient: { select: { firstName: true, lastName: true, phone: true } },
                    doctor: { select: { firstName: true, lastName: true } },
                },
            });
            if (!appt) return null;
            return { ...appt, startTimeLocal: toLocal(new Date(appt.startTime)) };
        }

        if (query.phone) {
            const normalizedPhone = query.phone.replace(/\D/g, '');
            const phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

            const appts = await this.prisma.appointment.findMany({
                where: {
                    clinicId,
                    patient: { OR: [{ phone }, { phone2: phone }] },
                    status: { not: 'CANCELLED' },
                },
                include: {
                    patient: { select: { firstName: true, lastName: true, phone: true } },
                    doctor: { select: { firstName: true, lastName: true } },
                },
                orderBy: { startTime: 'asc' },
                take: 5,
            });
            return appts.map(a => ({ ...a, startTimeLocal: toLocal(new Date(a.startTime)) }));
        }

        return null;
    }

    /** Normalize Turkish characters to ASCII for fuzzy doctor name matching */
    private normalizeTurkish(str: string): string {
        return str
            .toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ş/g, 's')
            .replace(/İ/g, 'i').replace(/Ö/g, 'o').replace(/Ç/g, 'c');
    }

    async findAvailabilityByDoctorName(clinicId: string, doctorName: string, date: string, preferredTime?: string) {
        const normalizedInput = this.normalizeTurkish(
            doctorName.replace(/^Dr\.?\s*/i, '').trim()
        );
        const doctors = await this.prisma.user.findMany({
            where: { clinicId, role: 'DOCTOR' },
        });

        const doctor = doctors.find(d => {
            const fullName = this.normalizeTurkish(`${d.firstName} ${d.lastName}`);
            const firstName = this.normalizeTurkish(d.firstName);
            const simpleInput = normalizedInput.replace(/\s+/g, '');
            const simpleFull = fullName.replace(/\s+/g, '');
            // Match by first name alone, full name, or partial
            return simpleFull.includes(simpleInput) || simpleInput.includes(simpleFull)
                || firstName.includes(simpleInput) || simpleInput.includes(firstName);
        });

        if (!doctor) throw new BadRequestException(`Doktor bulunamadı: "${doctorName}"`);

        const slots = await this.getAvailableSlots(clinicId, doctor.id, date);
        const pad = (n: number) => n.toString().padStart(2, '0');

        const allSlotsFormatted = slots.filter(s => s.available).map(s => {
            const d = new Date(s.startTime);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        });

        if (allSlotsFormatted.length === 0) {

            return {
                doctorId: doctor.id,
                doctorName: `${doctor.firstName} ${doctor.lastName}`,
                slots: [],
                message: 'Bu tarihte musait randevu yok.',
            };
        }

        // preferredTime verilmişse: exact match → sadece o, yoksa 3 yakın öneri
        if (preferredTime) {
            const exactSlot = allSlotsFormatted.find(s => s.endsWith(` ${preferredTime}`));
            if (exactSlot) {
                return {
                    doctorId: doctor.id,
                    doctorName: `${doctor.firstName} ${doctor.lastName}`,
                    slots: [exactSlot.split(' ')[1]],
                    available: true,
                };
            }
            // Exact slot dolu — 3 en yakın alternatif
            const [prefH, prefM] = preferredTime.split(':').map(Number);
            const prefMinutes = (prefH || 0) * 60 + (prefM || 0);
            const nearest = [...allSlotsFormatted]
                .sort((a, b) => {
                    const [aH, aM] = a.split(' ')[1].split(':').map(Number);
                    const [bH, bM] = b.split(' ')[1].split(':').map(Number);
                    return Math.abs((aH * 60 + aM) - prefMinutes) - Math.abs((bH * 60 + bM) - prefMinutes);
                })
                .slice(0, 3)
                .map(s => s.split(' ')[1]);
            return {
                doctorId: doctor.id,
                doctorName: `${doctor.firstName} ${doctor.lastName}`,
                slots: nearest,
                available: false,
                message: `${preferredTime} musait degil. En yakin alternatifler:`,
            };
        }

        // preferredTime yoksa: tüm müsait saatleri döndür
        return {
            doctorId: doctor.id,
            doctorName: `${doctor.firstName} ${doctor.lastName}`,
            slots: allSlotsFormatted.map(s => s.split(' ')[1]),
        };

    }


    async updateFromWhatsApp(clinicId: string, appointmentId: string, data: { startTime?: string; durationMin?: number }) {
        const appointment = await this.findOne(clinicId, appointmentId);
        if (appointment.status === 'CANCELLED') throw new BadRequestException('İptal edilmiş randevu güncellenemez');

        // Eski saati push için sakla
        const oldTimeStr = new Date(appointment.startTime).toLocaleString('tr-TR', {
            day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
        });

        // Normalize startTime: timezone yoksa Türkiye (+03:00) kabul et
        const rawUpdateStart = data.startTime ? String(data.startTime) : undefined;
        const normalizedUpdateStart = rawUpdateStart
            ? (rawUpdateStart.endsWith('Z') || /[+\-]\d{2}:\d{2}$/.test(rawUpdateStart)
                ? rawUpdateStart
                : rawUpdateStart + '+03:00')
            : undefined;

        const result = await this.update(clinicId, appointmentId, {
            startTime: normalizedUpdateStart ? new Date(normalizedUpdateStart) : undefined,
            durationMin: data.durationMin ? Number(data.durationMin) : undefined,
        });
        this.socketGateway.emitToClinic(clinicId, 'appointment:updated', { appointmentId });

        // Push notification — randevu değişikliği bildirimi
        const patientResult = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { patient: { select: { firstName: true, lastName: true } } },
        });
        const patName = patientResult?.patient
            ? `${patientResult.patient.firstName} ${patientResult.patient.lastName}`
            : 'Hasta';
        const newTimeStr = data.startTime
            ? new Date(data.startTime).toLocaleString('tr-TR', {
                day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
            })
            : oldTimeStr;

        await this.pushService.sendToRoles(
            clinicId,
            ['DOCTOR', 'ASSISTANT', 'ADMIN'],
            'appointmentUpdated',
            {
                title: '📅 Randevu Değişikliği Yapıldı',
                body: `${patName}: ${oldTimeStr} → ${newTimeStr}`,
                url: '/mobile/calendar',
                tag: `update-${appointmentId}`,
            },
        );

        // Dashboard aktivite widget'i için audit log
        await this.prisma.auditLog.create({
            data: {
                clinicId,
                userId: null,
                action: 'WHATSAPP_UPDATE',
                entityType: 'APPOINTMENT',
                entityId: appointmentId,
                oldValues: {
                    patientName: patName,
                    startTime: appointment.startTime,
                    source: 'WHATSAPP',
                },
                newValues: {
                    startTime: data.startTime ? new Date(data.startTime) : appointment.startTime,
                },
            },
        });

        return result;
    }

    async cancelFromWhatsApp(clinicId: string, appointmentId: string) {
        const appointment = await this.findOne(clinicId, appointmentId);
        if (appointment.status === 'CANCELLED') throw new BadRequestException('Bu randevu zaten iptal edilmiş');

        const cancelled = await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'CANCELLED', cancelReason: 'WhatsApp üzerinden iptal', reminderStatus: 'CANCELLED' },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        this.socketGateway.emitToClinic(clinicId, 'appointment:cancelled', { appointmentId });

        // Push notification — doktora ve asistanlara
        const aptDate = new Date(appointment.startTime);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = aptDate.toDateString() === tomorrow.toDateString();
        const patName = `${cancelled.patient?.firstName} ${cancelled.patient?.lastName}`;
        const timeStr = aptDate.toLocaleString('tr-TR', {
            day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul'
        });

        await this.pushService.sendToRoles(
            clinicId,
            ['DOCTOR', 'ASSISTANT', 'ADMIN'],
            'appointmentCancelled',
            {
                title: isTomorrow ? '🚨 Yarınki Randevu İptal Edildi' : '❌ WA Randevu İptali',
                body: `${patName} — ${timeStr}`,
                url: '/mobile/calendar',
                tag: `cancel-wa-${appointmentId}`,
            },
        );

        // Dashboard aktivite widget'i için audit log
        await this.prisma.auditLog.create({
            data: {
                clinicId,
                userId: null,
                action: 'WHATSAPP_CANCEL',
                entityType: 'APPOINTMENT',
                entityId: appointmentId,
                oldValues: {
                    patientName: patName,
                    doctorName: `${cancelled.doctor?.firstName ?? ''} ${cancelled.doctor?.lastName ?? ''}`.trim(),
                    startTime: appointment.startTime,
                    source: 'WHATSAPP',
                },
            },
        });

        return cancelled;
    }

    async confirmReminderFromWhatsApp(clinicId: string, appointmentId: string) {
        const appointment = await this.findOne(clinicId, appointmentId);
        if (appointment.status === 'CANCELLED') throw new BadRequestException('Bu randevu iptal edilmiş.');

        const updated = await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { reminderStatus: 'CONFIRMED' },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        // Real-time: takvim + yarınki randevular widget'ı güncellensin
        this.socketGateway.emitToClinic(clinicId, 'appointment:confirmed', { appointmentId });

        // Push notification — kliniğe bildir
        const patName = `${updated.patient?.firstName} ${updated.patient?.lastName}`;
        const timeStr = new Date(appointment.startTime).toLocaleString('tr-TR', {
            day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
        });
        await this.pushService.sendToRoles(
            clinicId,
            ['DOCTOR', 'ASSISTANT', 'ADMIN'],
            'appointmentUpdated',
            {
                title: '✅ Randevu Teyit Edildi (WhatsApp)',
                body: `${patName} — ${timeStr}`,
                url: '/mobile/calendar',
                tag: `confirm-${appointmentId}`,
            },
        );

        return updated;
    }

    async getMissingFollowups(clinicId: string) {
        // Look back 2 days
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 2);
        
        // Find COMPLETED appointments from the last 2 days
        const recentCompleted = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                status: 'COMPLETED',
                startTime: { gte: pastDate }
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { startTime: 'desc' }
        });

        if (recentCompleted.length === 0) return [];

        const patientIds = [...new Set(recentCompleted.map(a => a.patientId))];

        // Check if these patients have any future appointments
        const futureAppointments = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                patientId: { in: patientIds },
                startTime: { gt: new Date() },
                status: { in: ['CONFIRMED', 'COMPLETED'] }
            },
            select: { patientId: true }
        });

        const futurePatientIds = new Set(futureAppointments.map(a => a.patientId));

        // Filter out patients who already have a future appointment booked
        // Return only the most recent completed appointment for each missing-followup patient
        const missing = [];
        const seenPatients = new Set<string>();

        for (const appt of recentCompleted) {
            if (!futurePatientIds.has(appt.patientId) && !seenPatients.has(appt.patientId)) {
                missing.push(appt);
                seenPatients.add(appt.patientId);
            }
        }

        return missing;
    }

    async getTomorrowAppointments(clinicId: string) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayEnd = new Date(tomorrow);
        dayEnd.setDate(dayEnd.getDate() + 1);

        return this.prisma.appointment.findMany({
            where: {
                clinicId,
                startTime: { gte: tomorrow, lt: dayEnd },
                status: 'CONFIRMED',
            },
            include: {
                patient: true,
                doctor: true,
            },
        });
    }

    async completePastAppointments(clinicId: string) {
        const now = new Date();
        return this.prisma.appointment.updateMany({
            where: {
                clinicId,
                endTime: { lt: now },
                status: 'CONFIRMED',
            },
            data: {
                status: 'COMPLETED',
            },
        });
    }

    async generateReferenceCode(): Promise<string> {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async checkConflict(clinicId: string, doctorId: string, startTime: Date, endTime: Date, excludeId?: string) {
        const conflict = await this.prisma.appointment.findFirst({
            where: {
                clinicId,
                doctorId,
                id: excludeId ? { not: excludeId } : undefined,
                status: { in: ['CONFIRMED', 'CANCELLED'] }, // CANCELLED slotlar da bloke kalır
                OR: [
                    { startTime: { lt: endTime }, endTime: { gt: startTime } },
                ],
            },
        });
        return !!conflict;
    }

    /** n8n CRON: Yarin hatirlatmasi gonderilmesi gereken randevular (PENDING) */
    async getReminderDueAppointments(clinicId: string) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayEnd = new Date(tomorrow);
        dayEnd.setHours(23, 59, 59, 999);

        const appointments = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                status: 'CONFIRMED',
                reminderStatus: 'PENDING',
                startTime: { gte: tomorrow, lt: dayEnd },
            },
            include: {
                patient: {
                    select: { id: true, firstName: true, lastName: true, phone: true },
                },
                doctor: { select: { firstName: true, lastName: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        return appointments.map(apt => ({
            appointmentId: apt.id,
            patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
            patientPhone: apt.patient.phone,
            doctorName: `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`,
            startTime: apt.startTime,
            dateFormatted: new Date(apt.startTime).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul',
            }),
            timeFormatted: new Date(apt.startTime).toLocaleTimeString('tr-TR', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
            }),
        }));
    }

    /** n8n CRON: Hatirlatma gonderildi, reminderStatus = SENT olarak guncelle */
    async markReminderSent(clinicId: string, appointmentId: string) {
        await this.findOne(clinicId, appointmentId); // throws if not found
        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { reminderStatus: 'SENT' },
            select: { id: true, reminderStatus: true },
        });
    }
}
