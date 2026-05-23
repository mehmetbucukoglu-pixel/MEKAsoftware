import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus, AppointmentSource, UserRole } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';

@Injectable()
export class AppointmentService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private socketGateway: SocketGateway,
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
        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { status, cancelReason },
        });
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

    async remove(clinicId: string, appointmentId: string) {
        await this.findOne(clinicId, appointmentId);
        return this.prisma.appointment.delete({
            where: { id: appointmentId },
        });
    }

    async getAvailableSlots(clinicId: string, doctorId: string, date: string) {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayOfWeek = dayStart.getDay() === 0 ? 6 : dayStart.getDay() - 1; // 0=Monday

        // Get doctor schedule for this day
        const schedule = await this.prisma.doctorSchedule.findFirst({
            where: { clinicId, doctorId, dayOfWeek, isActive: true },
        });
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
        dayEndTime.setHours(endH, endM, 0, 0);

        const slotDuration = schedule.slotDuration > 0 ? schedule.slotDuration : 60;

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
        patientName: string;
        patientPhone: string;
        doctorName: string;
        startTime: any;
        durationMin: number;
        notes?: string;
    }) {
        console.log('--- WHATSAPP APPT CREATION STARTED (v3) ---');

        // 1. Normalize phone
        const normalizedPhone = data.patientPhone.replace(/\D/g, '');
        const phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

        // 2. Patient Recognition Logic
        let patientId: string | null = null;
        let isNewPatient = false;

        // A. Check PhonePatientLink
        const link = await this.prisma.phonePatientLink.findUnique({
            where: { clinicId_waPhone: { clinicId, waPhone: phone } },
            include: { patient: true }
        });

        if (link) {
            patientId = link.patientId;
            console.log('Found patient via PhonePatientLink:', patientId);
        } else {
            // B. Search by name (Fuzzy ILIKE-ish)
            const nameParts = data.patientName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '-';

            const existingPatient = await this.prisma.patient.findFirst({
                where: {
                    clinicId,
                    firstName: { equals: firstName, mode: 'insensitive' },
                    lastName: { equals: lastName, mode: 'insensitive' }
                }
            });

            if (existingPatient) {
                patientId = existingPatient.id;
                console.log('Found patient via Name Search:', patientId);
                // Create link for future
                await this.prisma.phonePatientLink.create({
                    data: { clinicId, waPhone: phone, patientId }
                });
            } else {
                // C. Create PRE_REGISTERED patient
                const newPatient = await this.prisma.patient.create({
                    data: {
                        clinicId,
                        firstName,
                        lastName,
                        phone,
                        registrationStatus: 'PRE_REGISTERED'
                    }
                });
                patientId = newPatient.id;
                isNewPatient = true;
                console.log('Created NEW PRE_REGISTERED patient:', patientId);
                // Create link
                await this.prisma.phonePatientLink.create({
                    data: { clinicId, waPhone: phone, patientId }
                });
            }
        }

        // Link patient to the active conversation immediately so UI updates
        // If it's a new patient, flag the conversation as 'Yeni Ön-Kayıt' so the doctor gets notified
        await this.prisma.conversation.updateMany({
            where: { clinicId, waPhone: phone, patientId: null },
            data: { 
                patientId,
                ...(isNewPatient ? { escalationReason: 'Yeni Ön-Kayıt', unreadCount: { increment: 1 } } : {})
            }
        });

        // 3. Find Doctor
        const normalizedDoctorInput = data.doctorName.replace(/^Dr\.?\s*/i, '').trim().toLowerCase();
        const doctors = await this.prisma.user.findMany({ where: { clinicId, role: 'DOCTOR' } });
        const doctor = doctors.find(d => {
            const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
            return fullName.includes(normalizedDoctorInput) || normalizedDoctorInput.includes(fullName);
        });

        if (!doctor) throw new BadRequestException(`Doktor bulunamadı: "${data.doctorName}"`);

        // 4. Create Appointment
        const appointment = await this.create(clinicId, {
            doctorId: doctor.id,
            patientId: patientId!,
            startTime: data.startTime,
            durationMin: Number(data.durationMin) || 60,
            notes: data.notes,
            source: 'WHATSAPP',
        });

        // 5. Notifications
        const patient = await this.prisma.patient.findUnique({ where: { id: patientId! } });
        const patientName = `${patient?.firstName} ${patient?.lastName}`;
        const dateStr = new Date(data.startTime).toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

        const apptMsg = `📅 ${isNewPatient ? '🆕 YENİ HASTA: ' : ''}${patientName} — ${dateStr}${isNewPatient ? ' (Lütfen TC Kimlik eksiklerini tamamlayın)' : ''}`;

        // Notify Doctor
        await this.notificationService.create(clinicId, doctor.id, {
            type: 'NEW_APPOINTMENT',
            title: isNewPatient ? 'Yeni Randevu ve Ön-Kayıt (WhatsApp)' : 'Yeni Randevu (WhatsApp)',
            body: apptMsg,
            entityType: 'APPOINTMENT',
            entityId: appointment.id
        });
        this.socketGateway.emitToUser(doctor.id, 'notification', { message: apptMsg });

        // Notify All Assistants
        const assistants = await this.prisma.user.findMany({ where: { clinicId, role: 'ASSISTANT' } });
        for (const assistant of assistants) {
            await this.notificationService.create(clinicId, assistant.id, {
                type: 'NEW_APPOINTMENT',
                title: isNewPatient ? 'Yeni Randevu ve Ön-Kayıt (WhatsApp)' : 'Yeni Randevu (WhatsApp)',
                body: apptMsg,
                entityType: 'APPOINTMENT',
                entityId: appointment.id
            });
            this.socketGateway.emitToUser(assistant.id, 'notification', { message: apptMsg });
        }

        return { ...appointment, isNewPatient };
    }


    async findByReferenceOrPhone(clinicId: string, query: { referenceCode?: string; phone?: string }) {
        if (query.referenceCode) {
            return this.prisma.appointment.findFirst({
                where: { clinicId, referenceCode: query.referenceCode },
                include: { patient: true, doctor: true },
            });
        }

        if (query.phone) {
            const normalizedPhone = query.phone.replace(/\D/g, '');
            const phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

            return this.prisma.appointment.findMany({
                where: { clinicId, patient: { phone } },
                include: { patient: true, doctor: true },
                orderBy: { startTime: 'desc' },
                take: 5,
            });
        }

        return null;
    }

    async findAvailabilityByDoctorName(clinicId: string, doctorName: string, date: string) {
        const normalizedInput = doctorName.replace(/^Dr\.?\s*/i, '').trim().toLowerCase();
        const doctors = await this.prisma.user.findMany({
            where: { clinicId, role: 'DOCTOR' },
        });

        const doctor = doctors.find(d => {
            const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
            const simpleInput = normalizedInput.replace(/\s+/g, '');
            const simpleFull = fullName.replace(/\s+/g, '');
            return simpleFull.includes(simpleInput) || simpleInput.includes(simpleFull);
        });

        if (!doctor) throw new BadRequestException(`Doktor bulunamadı: "${doctorName}"`);

        const slots = await this.getAvailableSlots(clinicId, doctor.id, date);
        const pad = (n: number) => n.toString().padStart(2, '0');

        const allSlotsFormatted = slots.filter(s => s.available).map(s => {
            const d = new Date(s.startTime);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        });

        // Smart Filtering: Suggest 3 best slots
        // 1. If we have a preferred time, try to find a slot near it
        // 2. Otherwise pick morning, noon, and afternoon
        const suggestedSlots: string[] = [];
        
        // Pick one around 10:00 (morning)
        const morning = allSlotsFormatted.find(s => s.includes(' 10:') || s.includes(' 09:'));
        if (morning) suggestedSlots.push(morning);

        // Pick one around 14:00 (afternoon)
        const afternoon = allSlotsFormatted.find(s => s.includes(' 14:') || s.includes(' 15:'));
        if (afternoon) suggestedSlots.push(afternoon);

        // Pick one around 18:00 (evening)
        const evening = allSlotsFormatted.find(s => s.includes(' 18:') || s.includes(' 19:'));
        if (evening) suggestedSlots.push(evening);

        // If still empty or too few, just take the first 3
        if (suggestedSlots.length < 2) {
            suggestedSlots.push(...allSlotsFormatted.slice(0, 3));
        }

        return {
            doctorId: doctor.id,
            doctorName: `${doctor.firstName} ${doctor.lastName}`,
            suggestedSlots: Array.from(new Set(suggestedSlots)).slice(0, 3), // Ensure uniqueness
            allSlotsCount: allSlotsFormatted.length,
        };
    }

    async updateFromWhatsApp(clinicId: string, appointmentId: string, data: { startTime?: string; durationMin?: number }) {
        const appointment = await this.findOne(clinicId, appointmentId);
        if (appointment.status === 'CANCELLED') throw new BadRequestException('İptal edilmiş randevu güncellenemez');

        return this.update(clinicId, appointmentId, {
            startTime: data.startTime ? new Date(data.startTime) : undefined,
            durationMin: data.durationMin ? Number(data.durationMin) : undefined,
        });
    }

    async cancelFromWhatsApp(clinicId: string, appointmentId: string) {
        const appointment = await this.findOne(clinicId, appointmentId);
        if (appointment.status === 'CANCELLED') throw new BadRequestException('Bu randevu zaten iptal edilmiş');

        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'CANCELLED', cancelReason: 'WhatsApp üzerinden iptal', reminderStatus: 'CANCELLED' },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }

    async confirmReminderFromWhatsApp(clinicId: string, appointmentId: string) {
        const appointment = await this.findOne(clinicId, appointmentId);
        if (appointment.status === 'CANCELLED') throw new BadRequestException('Bu randevu iptal edilmiş.');

        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { reminderStatus: 'CONFIRMED' },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } },
            },
        });
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
                status: 'CONFIRMED',
                OR: [
                    { startTime: { lt: endTime }, endTime: { gt: startTime } },
                ],
            },
        });
        return !!conflict;
    }
}
