import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

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

        // Get daily schedule (top 5 upcoming)
        const dailySchedule = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                startTime: { gte: startOfDay(today), lte: endOfDay(today) },
                status: { not: 'CANCELLED' }
            },
            include: {
                patient: { select: { firstName: true, lastName: true } },
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
}
