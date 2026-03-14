import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string, unreadOnly = false) {
        const where: any = { userId };
        if (unreadOnly) where.isRead = false;
        return this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    }

    async markAsRead(userId: string, notificationId: string) {
        return this.prisma.notification.update({ where: { id: notificationId, userId }, data: { isRead: true } });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    }

    async create(clinicId: string, userId: string, data: { type: string; title: string; body?: string; entityType?: string; entityId?: string }) {
        return this.prisma.notification.create({ data: { clinicId, userId, ...data } });
    }
}
