import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SocketGateway } from '../../common/gateways/socket.gateway';

@Injectable()
export class NotificationService {
    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => SocketGateway))
        private socketGateway: SocketGateway
    ) { }

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
        const notif = await this.prisma.notification.create({ data: { clinicId, userId, ...data } });
        
        // Push notification in real-time
        this.socketGateway.emitToUser(userId, 'app_notification', notif);
        
        return notif;
    }

    /**
     * Konuşma çözümlenince (bota geri alınma veya cevap verilince)
     * o konuşmaya ait okunmamış escalation bildirimlerini okundu yap.
     */
    async clearByConversation(clinicId: string, conversationId: string) {
        await this.prisma.notification.updateMany({
            where: {
                clinicId,
                isRead: false,
                entityType: 'conversation',
                entityId: conversationId,
            },
            data: { isRead: true },
        });
    }
}
