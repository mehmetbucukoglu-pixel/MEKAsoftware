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
                        registrationStatus: true,
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
            // Weekly Appointments
            this.prisma.appointment.count({
                where: { clinicId, startTime: { gte: startOfWeek(today), lte: endOfWeek(today) }, status: { not: 'CANCELLED' } }
            }),
            // Monthly Appointments
            this.prisma.appointment.count({
                where: { clinicId, startTime: { gte: startOfMonth(today), lte: endOfMonth(today) }, status: { not: 'CANCELLED' } }
            }),
            // Created Today (by bot or clinic)
            this.prisma.appointment.count({
                where: { clinicId, createdAt: { gte: startOfDay(today), lte: endOfDay(today) } }
            }),
            // Appointment Changes Today (updated today but not created today, or cancelled today)
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
            // Today's booked slots (for occupancy rate)
            this.prisma.appointment.count({
                where: {
                    clinicId,
                    startTime: { gte: startOfDay(today), lte: endOfDay(today) },
                    status: { not: 'CANCELLED' },
                }
            }),
            // Total Unread messages
            this.prisma.conversation.count({
                where: { clinicId, unreadCount: { gt: 0 } }
            }).catch(() => 0),
            // Doctor count
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
}

