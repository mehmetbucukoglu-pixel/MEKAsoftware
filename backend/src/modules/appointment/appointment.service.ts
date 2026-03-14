import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppointmentStatus, AppointmentSource } from '@prisma/client';

@Injectable()
export class AppointmentService {
    constructor(private prisma: PrismaService) { }

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

        const [data, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    doctor: { select: { id: true, firstName: true, lastName: true } },
                },
                orderBy: { startTime: 'asc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            this.prisma.appointment.count({ where })
        ]);

        return {
            data,
            meta: { total, page: pageNum, limit: limitNum }
        };
    }

    async findOne(clinicId: string, appointmentId: string) {
        return this.prisma.appointment.findFirst({
            where: { id: appointmentId, clinicId },
            include: {
                patient: true,
                doctor: { select: { id: true, firstName: true, lastName: true } },
                clinicalNotes: true,
                payments: true,
            },
        });
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
        const startDateTime = new Date(data.startTime);
        const endTime = new Date(startDateTime);
        endTime.setMinutes(endTime.getMinutes() + data.durationMin);

        // Layer 1: Application-level conflict check
        const conflict = await this.checkConflict(clinicId, data.doctorId, startDateTime, endTime);
        if (conflict) {
            throw new ConflictException('Bu zaman aralığında doktorun başka bir randevusu var');
        }

        // Layer 2: DB-level insert with exclusion constraint as safety net
        try {
            return await this.prisma.appointment.create({
                data: {
                    clinicId,
                    doctorId: data.doctorId,
                    patientId: data.patientId,
                    startTime: startDateTime,
                    endTime,
                    durationMin: data.durationMin,
                    notes: data.notes,
                    source: data.source || 'MANUAL',
                    createdBy: data.createdBy,
                    status: 'CONFIRMED',
                },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    doctor: { select: { id: true, firstName: true, lastName: true } },
                },
            });
        } catch (error: any) {
            // Catch DB exclusion constraint violation (race condition safety)
            if (error.code === 'P2002' || error.message?.includes('no_overlap')) {
                throw new ConflictException('Bu zaman aralığında doktorun başka bir randevusu var');
            }
            throw error;
        }
    }

    async updateStatus(clinicId: string, appointmentId: string, status: AppointmentStatus, cancelReason?: string) {
        const appointment = await this.prisma.appointment.findFirst({ where: { id: appointmentId, clinicId } });
        if (!appointment) throw new NotFoundException('Randevu bulunamadı');

        const data: any = { status, cancelReason };

        // HBYS: Record check-in/check-out timestamps
        if (status === 'ARRIVED') {
            data.arrivedAt = new Date();
        } else if (status === 'COMPLETED') {
            data.completedAt = new Date();
        }

        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data,
        });
    }

    async update(clinicId: string, appointmentId: string, data: { startTime?: Date; durationMin?: number; notes?: string }) {
        const appointment = await this.prisma.appointment.findFirst({ where: { id: appointmentId, clinicId } });
        if (!appointment) throw new NotFoundException('Randevu bulunamadı');

        const updateData: any = { ...data };
        if (data.startTime && data.durationMin) {
            const startDateTime = new Date(data.startTime);
            const endTime = new Date(startDateTime);
            endTime.setMinutes(endTime.getMinutes() + data.durationMin);
            updateData.startTime = startDateTime;
            updateData.endTime = endTime;

            // Check conflict for updated time
            const conflict = await this.checkConflict(clinicId, appointment.doctorId, startDateTime, endTime, appointmentId);
            if (conflict) {
                throw new ConflictException('Bu zaman aralığında doktorun başka bir randevusu var');
            }
        }

        return this.prisma.appointment.update({ where: { id: appointmentId }, data: updateData });
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

        while (current < dayEndTime) {
            const slotEnd = new Date(current);
            slotEnd.setMinutes(slotEnd.getMinutes() + schedule.slotDuration);

            // Skip break time
            if (breakStart && breakEnd) {
                const breakStartTime = new Date(dayStart);
                breakStartTime.setHours(breakStart[0], breakStart[1], 0, 0);
                const breakEndTime = new Date(dayStart);
                breakEndTime.setHours(breakEnd[0], breakEnd[1], 0, 0);

                if (current >= breakStartTime && current < breakEndTime) {
                    current = new Date(breakEndTime);
                    continue;
                }
            }

            // Check if slot overlaps with any appointment
            const isOccupied = appointments.some(
                (apt) => apt.startTime < slotEnd && apt.endTime > current,
            );

            slots.push({ startTime: new Date(current), endTime: new Date(slotEnd), available: !isOccupied });
            current = slotEnd;
        }

        return slots;
    }

    async getDoctorSchedule(clinicId: string, doctorId: string) {
        return this.prisma.doctorSchedule.findMany({ where: { clinicId, doctorId }, orderBy: { dayOfWeek: 'asc' } });
    }

    async updateDoctorSchedule(clinicId: string, doctorId: string, schedules: any[]) {
        await this.prisma.$transaction(async (tx) => {
            await tx.doctorSchedule.deleteMany({ where: { clinicId, doctorId } });
            await tx.doctorSchedule.createMany({
                data: schedules.map((s) => ({ clinicId, doctorId, ...s })),
            });
        });
        return this.getDoctorSchedule(clinicId, doctorId);
    }

    // --- Private ---

    private async checkConflict(clinicId: string, doctorId: string, startTime: Date, endTime: Date, excludeId?: string) {
        const where: any = {
            clinicId,
            doctorId,
            status: 'CONFIRMED',
            startTime: { lt: endTime },
            endTime: { gt: startTime },
        };
        if (excludeId) where.id = { not: excludeId };

        const conflict = await this.prisma.appointment.findFirst({ where });
        return conflict;
    }
}
