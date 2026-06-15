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
        // Widget: "Yarınki Randevular" — teyit mesajları yarınki randevulara atılır
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const appointments = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                startTime: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) },
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

        const [created, changed, deleted, waEvents] = await Promise.all([
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
                    // WhatsApp iptallerini çıkar — audit log'dan ayrıca okunacak
                    NOT: { cancelReason: { startsWith: 'WhatsApp' } },
                },
                include: { patient: { select: { firstName: true, lastName: true, phone: true } } },
                orderBy: { updatedAt: 'desc' },
                take: 15,
            }),
            // Manuel silinen randevular
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
            // WhatsApp iptal + erteleme audit logları
            this.prisma.auditLog.findMany({
                where: {
                    clinicId,
                    action: { in: ['WHATSAPP_CANCEL', 'WHATSAPP_UPDATE'] },
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
            // Manuel silinen randevular — oldValues JSON'dan veri alınır
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
            // WhatsApp kaynaklı iptal ve erteleme
            ...waEvents.map(log => {
                const old = (log.oldValues as any) ?? {};
                const nw = (log.newValues as any) ?? {};
                return {
                    appointmentId: log.entityId ?? '',
                    patientName: old.patientName ?? 'Bilinmeyen Hasta',
                    patientPhone: old.patientPhone ?? null,
                    action: log.action as 'WHATSAPP_CANCEL' | 'WHATSAPP_UPDATE',
                    source: 'WHATSAPP' as const,
                    time: log.createdAt,
                    startTime: old.startTime ?? null,
                    oldStartTime: old.startTime ?? null,
                    newStartTime: nw.startTime ?? null,
                };
            }),
        ];

        return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);
    }

    async getPendingEscalations(clinicId: string) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                clinicId,
                status: 'HUMAN',
                escalationReason: { not: null },   // sadece bot escalate ettiklerini göster
            },
            include: {
                patient: { select: { firstName: true, lastName: true } },
            },
            orderBy: { humanModeAt: 'desc' },
            take: 20,
        });

        const normalizeTR = (str: string) =>
            str
                .replace(/ç/g, 'c').replace(/Ç/g, 'C')
                .replace(/ş/g, 's').replace(/Ş/g, 'S')
                .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
                .replace(/ü/g, 'u').replace(/Ü/g, 'U')
                .replace(/ö/g, 'o').replace(/Ö/g, 'O')
                .replace(/ı/g, 'i').replace(/İ/g, 'I');

        return conversations.map(conv => ({
            conversationId: conv.id,
            patientName: conv.patient
                ? normalizeTR(`${conv.patient.firstName} ${conv.patient.lastName}`)
                : conv.waPhone,
            waPhone: conv.waPhone,
            escalationReason: conv.escalationReason ? normalizeTR(conv.escalationReason) : null,
            humanModeAt: conv.humanModeAt,
            lastMessageHint: conv.escalationReason
                ? normalizeTR(conv.escalationReason)
                : null,
        }));
    }
}

