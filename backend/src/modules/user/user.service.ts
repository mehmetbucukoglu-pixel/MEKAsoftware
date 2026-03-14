import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string) {
        return this.prisma.user.findMany({
            where: { clinicId, isActive: true },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true },
        });
    }

    async findAllDoctors(clinicId: string) {
        return this.prisma.user.findMany({
            where: { clinicId, isActive: true, role: { in: ['DOCTOR', 'ADMIN'] } },
            select: { id: true, firstName: true, lastName: true, role: true },
        });
    }

    async create(clinicId: string, data: { email: string; password: string; firstName: string; lastName: string; phone?: string; role: UserRole }) {
        const passwordHash = await bcrypt.hash(data.password, 12);
        return this.prisma.user.create({
            data: { clinicId, email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, phone: data.phone, role: data.role },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true },
        });
    }

    async update(clinicId: string, userId: string, data: { firstName?: string; lastName?: string; phone?: string; role?: UserRole }) {
        return this.prisma.user.update({
            where: { id: userId, clinicId },
            data,
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
        });
    }

    async deactivate(clinicId: string, userId: string) {
        return this.prisma.user.update({ where: { id: userId, clinicId }, data: { isActive: false } });
    }
}
