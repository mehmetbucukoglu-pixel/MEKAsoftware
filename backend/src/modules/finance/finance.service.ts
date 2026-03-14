import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentMethod, PaymentType } from '@prisma/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class FinanceService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string, filters: { patientId?: string; page?: number; limit?: number }) {
        const { patientId, page = 1, limit = 20 } = filters;
        const where: any = { clinicId };
        if (patientId) where.patientId = patientId;

        const [data, total] = await Promise.all([
            this.prisma.payment.findMany({
                where, orderBy: { paidAt: 'desc' }, skip: (page - 1) * limit, take: limit,
                include: { patient: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.payment.count({ where }),
        ]);
        return { data, total, page, limit };
    }

    async create(clinicId: string, createdBy: string, data: {
        patientId: string; appointmentId?: string; amount: number;
        paymentMethod: PaymentMethod; paymentType?: PaymentType; description?: string;
    }) {
        return this.prisma.payment.create({
            data: { clinicId, createdBy, ...data },
        });
    }

    async getPatientBalance(clinicId: string, patientId: string) {
        const [paidResult, refundResult] = await Promise.all([
            this.prisma.payment.aggregate({
                where: { clinicId, patientId, paymentType: 'PAYMENT' },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: { clinicId, patientId, paymentType: 'REFUND' },
                _sum: { amount: true },
            }),
        ]);

        const totalPaid = Number(paidResult._sum.amount || 0);
        const totalRefund = Number(refundResult._sum.amount || 0);

        return { totalPaid, totalRefund, balance: totalPaid - totalRefund };
    }

    async getSummary(clinicId: string, period: 'week' | 'month' | 'quarter' | 'custom' = 'month', startDate?: string, endDate?: string) {
        const now = new Date();
        let start = startOfDay(now);
        let end = endOfDay(now);

        if (period === 'week') {
            start = startOfDay(subDays(now, 7));
        } else if (period === 'month') {
            start = startOfDay(subDays(now, 30));
        } else if (period === 'quarter') {
            start = startOfDay(subDays(now, 90));
        } else if (period === 'custom' && startDate) {
            start = startOfDay(new Date(startDate));
            if (endDate) end = endOfDay(new Date(endDate));
        }

        const where: any = { clinicId, paidAt: { gte: start, lte: end } };

        const [
            paymentAggr,
            refundAggr,
            fixedExpenseAggr,
            variableExpenseAggr,
            paymentCount,
            expenseCount
        ] = await Promise.all([
            this.prisma.payment.aggregate({ where: { ...where, paymentType: 'PAYMENT' }, _sum: { amount: true } }),
            this.prisma.payment.aggregate({ where: { ...where, paymentType: 'REFUND' }, _sum: { amount: true } }),
            this.prisma.expense.aggregate({ where: { ...where, category: 'FIXED' } as any, _sum: { amount: true } }),
            this.prisma.expense.aggregate({ where: { ...where, category: 'VARIABLE' } as any, _sum: { amount: true } }),
            this.prisma.payment.count({ where }),
            this.prisma.expense.count({ where }),
        ]);

        const totalIncome = Number(paymentAggr._sum.amount || 0);
        const totalRefunds = Number(refundAggr._sum.amount || 0);

        const fixedExpenses = Number(fixedExpenseAggr._sum.amount || 0);
        const variableExpenses = Number(variableExpenseAggr._sum.amount || 0);
        const totalExpenses = fixedExpenses + variableExpenses;

        return {
            totalIncome,
            totalRefunds,
            totalExpenses,
            fixedExpenses,
            variableExpenses,
            netIncome: totalIncome - totalRefunds - totalExpenses,
            transactionCount: paymentCount + expenseCount,
            period: { start, end }
        };
    }
}
