import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getDashboardData(clinicId: string) {
        const today = new Date();
        const firstDayOfMonth = startOfMonth(today);
        const lastDayOfMonth = endOfMonth(today);

        const [
            patientCount,
            appointmentsToday,
            monthlyPayments,
        ] = await Promise.all([
            this.prisma.patient.count({ where: { clinicId, isActive: true } }),
            this.prisma.appointment.count({
                where: {
                    clinicId,
                    startTime: { gte: startOfDay(today), lte: endOfDay(today) },
                    status: { not: 'CANCELLED' }
                }
            }),
            this.prisma.payment.findMany({
                where: {
                    clinicId,
                    paidAt: { gte: firstDayOfMonth, lte: lastDayOfMonth }
                }
            })
        ]);

        const monthlyRevenue = monthlyPayments
            .filter(p => p.paymentType === 'PAYMENT')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const monthlyRefunds = monthlyPayments
            .filter(p => p.paymentType === 'REFUND')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // Get daily schedule (top 10 upcoming)
        const dailySchedule = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                startTime: { gte: startOfDay(today), lte: endOfDay(today) },
                status: { not: 'CANCELLED' }
            },
            include: {
                patient: {
                    select: {
                        firstName: true,
                        lastName: true,
                        conversations: {
                            where: { clinicId },
                            select: { status: true, escalationReason: true, unreadCount: true },
                            take: 1,
                            orderBy: { updatedAt: 'desc' }
                        }
                    }
                },
                doctor: { select: { firstName: true, lastName: true } }
            },
            orderBy: { startTime: 'asc' },
            take: 10
        });

        return {
            stats: {
                totalPatients: patientCount,
                appointmentsToday,
                monthlyRevenue: monthlyRevenue - monthlyRefunds,
            },
            dailySchedule
        };
    }

    async getExtendedKpis(clinicId: string) {
        const today = new Date();
        const weekAgo = subDays(today, 7);

        const [
            weeklyAppointments,
            monthlyAppointments,
            createdToday,
            appointmentChangesToday,
            bookedSlots,
            unreadMessages,
            doctorCount
        ] = await Promise.all([
            this.prisma.appointment.count({
                where: { clinicId, startTime: { gte: startOfWeek(today), lte: endOfWeek(today) }, status: { not: 'CANCELLED' } }
            }),
            this.prisma.appointment.count({
                where: { clinicId, startTime: { gte: startOfMonth(today), lte: endOfMonth(today) }, status: { not: 'CANCELLED' } }
            }),
            this.prisma.appointment.count({
                where: { clinicId, createdAt: { gte: startOfDay(today), lte: endOfDay(today) } }
            }),
            this.prisma.appointment.count({
                where: {
                    clinicId,
                    updatedAt: { gte: startOfDay(today), lte: endOfDay(today) },
                    OR: [
                        { status: 'CANCELLED' },
                        { createdAt: { lt: startOfDay(today) } }
                    ]
                }
            }),
            this.prisma.appointment.count({
                where: {
                    clinicId,
                    startTime: { gte: startOfDay(today), lte: endOfDay(today) },
                    status: { not: 'CANCELLED' },
                }
            }),
            this.prisma.conversation.count({
                where: { clinicId, unreadCount: { gt: 0 } }
            }).catch(() => 0),
            this.prisma.user.count({
                where: { clinicId, role: 'DOCTOR' }
            })
        ]);

        const dailyCapacity = doctorCount * 10;
        const occupancyRate = dailyCapacity > 0 ? Math.round((bookedSlots / dailyCapacity) * 100) : 0;

        return {
            weeklyAppointments,
            monthlyAppointments,
            createdToday,
            appointmentChangesToday,
            occupancyRate: Math.min(occupancyRate, 100),
            unreadMessages,
        };
    }

    async getTodayReminderStatus(clinicId: string) {
        const today = new Date();
        const appointments = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                startTime: { gte: startOfDay(today), lte: endOfDay(today) },
                status: { not: 'CANCELLED' },
            },
            include: {
                patient: { select: { firstName: true, lastName: true } },
                doctor: { select: { firstName: true, lastName: true } },
            },
            orderBy: { startTime: 'asc' },
            take: 20,
        });

        return appointments.map(apt => ({
            appointmentId: apt.id,
            patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
            doctorName: `${apt.doctor.firstName} ${apt.doctor.lastName}`,
            startTime: apt.startTime,
            reminderStatus: apt.reminderStatus,
        }));
    }

    async getTodayAppointmentActivity(clinicId: string) {
        const today = new Date();

        const [created, changed, deleted] = await Promise.all([
            this.prisma.appointment.findMany({
                where: {
                    clinicId,
                    createdAt: { gte: startOfDay(today), lte: endOfDay(today) },
                },
                include: { patient: { select: { firstName: true, lastName: true, phone: true } } },
                orderBy: { createdAt: 'desc' },
                take: 15,
            }),
            this.prisma.appointment.findMany({
                where: {
                    clinicId,
                    updatedAt: { gte: startOfDay(today), lte: endOfDay(today) },
                    createdAt: { lt: startOfDay(today) },
                },
                include: { patient: { select: { firstName: true, lastName: true, phone: true } } },
                orderBy: { updatedAt: 'desc' },
                take: 15,
            }),
            // Bugün silinen randevular — AuditLog'dan okunur
            this.prisma.auditLog.findMany({
                where: {
                    clinicId,
                    action: 'DELETE',
                    entityType: 'APPOINTMENT',
                    createdAt: { gte: startOfDay(today), lte: endOfDay(today) },
                },
                orderBy: { createdAt: 'desc' },
                take: 15,
            }),
        ]);

        const items = [
            ...created.map(a => ({
                appointmentId: a.id,
                patientName: `${a.patient.firstName} ${a.patient.lastName}`,
                patientPhone: a.patient.phone,
                action: 'CREATED' as const,
                source: a.source,
                time: a.createdAt,
                startTime: a.startTime,
            })),
            ...changed.map(a => ({
                appointmentId: a.id,
                patientName: `${a.patient.firstName} ${a.patient.lastName}`,
                patientPhone: a.patient.phone,
                action: a.status === 'CANCELLED' ? ('CANCELLED' as const) : ('UPDATED' as const),
                source: a.source,
                time: a.updatedAt,
                startTime: a.startTime,
            })),
            // Silinen randevular — oldValues JSON'dan veri alınır
            ...deleted.map(log => {
                const old = (log.oldValues as any) ?? {};
                return {
                    appointmentId: log.entityId ?? '',
                    patientName: old.patientName ?? 'Bilinmeyen Hasta',
                    patientPhone: old.patientPhone ?? null,
                    action: 'DELETED' as const,
                    source: (old.source ?? 'MANUAL') as 'MANUAL' | 'WHATSAPP',
                    time: log.createdAt,
                    startTime: old.startTime ?? null,
                };
            }),
        ];

        return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
    }

    async getPendingEscalations(clinicId: string) {
        const conversations = await this.prisma.conversation.findMany({
            where: { clinicId, status: 'HUMAN' },
            include: {
                patient: { select: { firstName: true, lastName: true } },
            },
            orderBy: { humanModeAt: 'desc' },
            take: 20,
        });

        return Promise.all(conversations.map(async conv => {
            const lastMsg = await this.prisma.message.findFirst({
                where: { conversationId: conv.id, direction: 'INBOUND' },
                orderBy: { createdAt: 'desc' },
                select: { body: true, createdAt: true },
            });

            return {
                conversationId: conv.id,
                patientName: conv.patient
                    ? `${conv.patient.firstName} ${conv.patient.lastName}`
                    : conv.waPhone,
                waPhone: conv.waPhone,
                escalationReason: conv.escalationReason,
                humanModeAt: conv.humanModeAt,
                lastMessageHint: lastMsg?.body
                    ? lastMsg.body.substring(0, 60) + (lastMsg.body.length > 60 ? '...' : '')
                    : null,
            };
        }));
    }
}

