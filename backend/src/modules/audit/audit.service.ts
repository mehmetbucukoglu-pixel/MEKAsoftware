import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string, filters: { entityType?: string; entityId?: string; page?: number; limit?: number }) {
        const { entityType, entityId, page = 1, limit = 50 } = filters;
        const where: any = { clinicId };
        if (entityType) where.entityType = entityType;
        if (entityId) where.entityId = entityId;

        return this.prisma.auditLog.findMany({
            where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        });
    }

    async create(data: {
        clinicId: string;
        userId?: string;
        action: string;
        entityType: string;
        entityId?: string;
        oldValues?: any;
        newValues?: any;
        ipAddress?: string;
    }) {
        return this.prisma.auditLog.create({ data });
    }
}
