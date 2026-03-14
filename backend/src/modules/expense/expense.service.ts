import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpenseService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string) {
        return this.prisma.expense.findMany({
            where: { clinicId },
            include: { creator: { select: { firstName: true, lastName: true } } },
            orderBy: { paidAt: 'desc' }
        });
    }

    async findOne(clinicId: string, id: string) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, clinicId }
        });
        if (!expense) throw new NotFoundException('Gider bulunamadı');
        return expense;
    }

    async create(clinicId: string, creatorId: string, data: CreateExpenseDto) {
        return this.prisma.expense.create({
            data: {
                ...data,
                clinicId,
                createdBy: creatorId,
            }
        });
    }

    async update(clinicId: string, id: string, data: any) {
        return this.prisma.expense.update({
            where: { id, clinicId },
            data
        });
    }

    async remove(clinicId: string, id: string) {
        await this.findOne(clinicId, id);
        return this.prisma.expense.delete({
            where: { id }
        });
    }
}
