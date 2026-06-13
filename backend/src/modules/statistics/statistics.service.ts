import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { format, startOfMonth, endOfMonth, isValid, subDays, subMonths } from 'date-fns';

type Period = '14d' | '30d' | '3m';

interface DateFilter {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
}

@Injectable()
export class StatisticsService {
    constructor(private prisma: PrismaService) { }

    async getOverview(clinicId: string, filters: DateFilter) {
        const { start, end } = this.parseDateRange(filters);
        const where: any = {
            clinicId,
            startTime: { gte: start, lte: end },
        };
        if (filters.doctorId) where.doctorId = filters.doctorId;

        const [
            statusCounts,
            activePatients,
            completedWithTimes,
            doctorStats,
        ] = await Promise.all([
            // Group by status
            this.prisma.appointment.groupBy({
                by: ['status'],
                where,
                _count: { id: true },
            }),
            // Unique patients in range
            this.prisma.appointment.findMany({
                where: { ...where, status: { not: 'CANCELLED' } },
                select: { patientId: true },
                distinct: ['patientId'],
            }),
            // Completed appointments with arrival & completion times (for avg duration)
            this.prisma.appointment.findMany({
                where: {
                    ...where,
                    status: 'COMPLETED',
                    arrivedAt: { not: null },
                    completedAt: { not: null },
                },
                select: { arrivedAt: true, completedAt: true },
            }),
            // Doctor breakdown
            this.prisma.appointment.groupBy({
                by: ['doctorId'],
                where: { ...where, status: { not: 'CANCELLED' } },
                _count: { id: true },
            }),
        ]);

        let totalAppointments = 0;
        let arrivedCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;
        let noShowCount = 0;

        for (const group of statusCounts) {
            const count = group._count.id;
            totalAppointments += count;
            if (group.status === 'ARRIVED') arrivedCount += count;
            if (group.status === 'COMPLETED') completedCount += count;
            if (group.status === 'CANCELLED') cancelledCount += count;
            if (group.status === 'NO_SHOW') noShowCount += count;
        }

        // Calculate average session duration
        let avgSessionMinutes = 0;
        if (completedWithTimes.length > 0) {
            const totalMinutes = completedWithTimes.reduce((sum, apt) => {
                const diff = (apt.completedAt!.getTime() - apt.arrivedAt!.getTime()) / (1000 * 60);
                return sum + diff;
            }, 0);
            avgSessionMinutes = Math.round(totalMinutes / completedWithTimes.length);
        }

        // No-show rate
        const totalNonCancelled = totalAppointments - cancelledCount;
        const noShowRate = totalNonCancelled > 0 ? Math.round((noShowCount / totalNonCancelled) * 100) : 0;

        // Fetch doctor names
        const doctorIds = doctorStats.map(d => d.doctorId);
        const doctors = await this.prisma.user.findMany({
            where: { id: { in: doctorIds } },
            select: { id: true, firstName: true, lastName: true },
        });
        const doctorMap = new Map(doctors.map(d => [d.id, `${d.firstName} ${d.lastName}`]));

        const doctorBreakdown = doctorStats.map(d => ({
            doctorId: d.doctorId,
            doctorName: doctorMap.get(d.doctorId) || 'Bilinmiyor',
            count: d._count.id,
        }));

        return {
            totalAppointments,
            checkedIn: arrivedCount + completedCount, // total who arrived
            completed: completedCount,
            cancelled: cancelledCount,
            noShow: noShowCount,
            noShowRate,
            uniquePatients: activePatients.length,
            avgSessionMinutes,
            doctorBreakdown,
        };
    }

    async getVisitStats(clinicId: string, filters: DateFilter) {
        const { start, end } = this.parseDateRange(filters);
        const where: any = {
            clinicId,
            startTime: { gte: start, lte: end },
            status: { not: 'CANCELLED' },
        };
        if (filters.doctorId) where.doctorId = filters.doctorId;

        const appointments = await this.prisma.appointment.findMany({
            where,
            select: {
                startTime: true,
                status: true,
                arrivedAt: true,
                completedAt: true,
            },
            orderBy: { startTime: 'asc' },
        });

        // Daily visit counts
        const dailyMap = new Map<string, { date: string; visits: number; completed: number; noShow: number }>();
        for (const apt of appointments) {
            const dateKey = format(apt.startTime, 'yyyy-MM-dd');
            const existing = dailyMap.get(dateKey) || { date: dateKey, visits: 0, completed: 0, noShow: 0 };
            existing.visits++;
            if (apt.status === 'COMPLETED') existing.completed++;
            if (apt.status === 'NO_SHOW') existing.noShow++;
            dailyMap.set(dateKey, existing);
        }

        // Hourly distribution (0-23)
        const hourly = new Array(24).fill(0);
        for (const apt of appointments) {
            const hour = apt.startTime.getHours();
            hourly[hour]++;
        }

        return {
            daily: Array.from(dailyMap.values()),
            hourly: hourly.map((count, hour) => ({ hour, count })),
        };
    }

    async getRecentVisits(clinicId: string, limit: number) {
        return this.prisma.appointment.findMany({
            where: {
                clinicId,
                status: { in: ['ARRIVED', 'COMPLETED'] },
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                doctor: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { arrivedAt: { sort: 'desc', nulls: 'last' } },
            take: limit,
        });
    }

    async getChatInsights(clinicId: string) {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const [
            convStats,
            escalationReasons,
            unlinkedCount,
            dailyMsgCounts
        ] = await Promise.all([
            // Mode distribution
            this.prisma.conversation.groupBy({
                by: ['status'],
                where: { clinicId, updatedAt: { gte: last30Days } },
                _count: { id: true },
            }),
            // Common escalation reasons
            this.prisma.conversation.groupBy({
                by: ['escalationReason'],
                where: { 
                    clinicId, 
                    escalationReason: { not: null },
                    updatedAt: { gte: last30Days }
                },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            }),
            // Unlinked phone numbers
            this.prisma.conversation.count({
                where: { clinicId, patientId: null }
            }),
            // Daily message volume
            this.prisma.message.groupBy({
                by: ['createdAt'],
                where: { clinicId, createdAt: { gte: last30Days } },
                _count: { id: true }
            })
        ]);

        // Process daily volume
        const dailyMap = new Map<string, number>();
        dailyMsgCounts.forEach(m => {
            const date = format(m.createdAt, 'yyyy-MM-dd');
            dailyMap.set(date, (dailyMap.get(date) || 0) + m._count.id);
        });

        return {
            modeDistribution: convStats.map(s => ({ status: s.status, count: s._count.id })),
            topEscalationReasons: escalationReasons.map(r => ({ reason: r.escalationReason, count: r._count.id })),
            unlinkedPatients: unlinkedCount,
            dailyVolume: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))
        };
    }

    async getEscalationStats(clinicId: string, period: Period = '30d') {
        const { start, end } = this.periodToRange(period);

        const conversations = await this.prisma.conversation.findMany({
            where: {
                clinicId,
                status: 'HUMAN',
                humanModeAt: { gte: start, lte: end },
            },
            select: { escalationReason: true, humanModeAt: true },
        });

        // Daily chart
        const dailyMap = new Map<string, number>();
        conversations.forEach(c => {
            if (c.humanModeAt) {
                const d = format(c.humanModeAt, 'yyyy-MM-dd');
                dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
            }
        });

        // Reason breakdown
        const reasonMap = new Map<string, number>();
        conversations.forEach(c => {
            const r = c.escalationReason || 'Belirtilmedi';
            reasonMap.set(r, (reasonMap.get(r) || 0) + 1);
        });

        return {
            total: conversations.length,
            period,
            dailyChart: Array.from(dailyMap.entries())
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date)),
            reasons: Array.from(reasonMap.entries())
                .map(([reason, count]) => ({ reason, count }))
                .sort((a, b) => b.count - a.count),
        };
    }

    async getAutoAppointmentStats(clinicId: string, period: Period = '30d') {
        const { start, end } = this.periodToRange(period);

        const appointments = await this.prisma.appointment.findMany({
            where: {
                clinicId,
                source: 'WHATSAPP',
                createdAt: { gte: start, lte: end },
            },
            select: { createdAt: true, status: true },
        });

        const dailyMap = new Map<string, number>();
        appointments.forEach(a => {
            const d = format(a.createdAt, 'yyyy-MM-dd');
            dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
        });

        return {
            total: appointments.length,
            period,
            dailyChart: Array.from(dailyMap.entries())
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date)),
        };
    }

    async getNewPatientStats(clinicId: string, period: Period = '30d') {
        const { start, end } = this.periodToRange(period);

        const patients = await this.prisma.patient.findMany({
            where: { clinicId, isActive: true, createdAt: { gte: start, lte: end } },
            select: { createdAt: true },
        });

        const dailyMap = new Map<string, number>();
        patients.forEach(p => {
            const d = format(p.createdAt, 'yyyy-MM-dd');
            dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
        });

        return {
            total: patients.length,
            period,
            dailyChart: Array.from(dailyMap.entries())
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date)),
        };
    }

    // --- Helpers ---

    private periodToRange(period: Period): { start: Date; end: Date } {
        const end = new Date();
        let start: Date;
        if (period === '14d') start = subDays(end, 14);
        else if (period === '3m') start = subMonths(end, 3);
        else start = subDays(end, 30); // default 30d
        return { start, end };
    }

    private parseDateRange(filters: DateFilter) {
        if (filters.startDate && filters.endDate) {
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            if (isValid(startDate) && isValid(endDate)) {
                return { start: startDate, end: endDate };
            }
        }
        const now = new Date();
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
}
